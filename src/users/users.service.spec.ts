import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

const writeFileMock = jest.mocked(fs.writeFile);
const mkdirMock = jest.mocked(fs.mkdir);

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const hashingMock = { hash: jest.fn() };

const prismaError = (code: string) =>
  Object.assign(new Error(code), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

const userSelect = {
  id: true,
  name: true,
  email: true,
  watchedMovies: { select: { movie: { select: { name: true } } } },
};

const userFromDb = {
  id: 1,
  name: 'Bruno',
  email: 'bruno@teste.com',
  watchedMovies: [{ movie: { name: 'Fight Club' } }],
};

const userResponse = {
  id: 1,
  name: 'Bruno',
  email: 'bruno@teste.com',
  watchedMovies: ['Fight Club'],
};

const makeToken = (sub: number): PayloadTokenDto => ({
  sub,
  aud: '',
  email: 'bruno@teste.com',
  exp: 1,
  iat: 1,
  iss: '',
});

const buildFile = (
  overrides: Partial<UploadedAvatarFile> = {},
): UploadedAvatarFile => ({
  originalname: 'avatar.png',
  mimetype: 'image/png',
  buffer: Buffer.from('mock'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashingServiceProtocol, useValue: hashingMock },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'bruno@teste.com',
      name: 'Bruno',
      password: '123123',
    };

    it('hashes the password and creates the user', async () => {
      hashingMock.hash.mockResolvedValue('HASH');
      prismaMock.user.create.mockResolvedValue(userFromDb);

      const result = await service.create(dto);

      expect(hashingMock.hash).toHaveBeenCalledWith(dto.password);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { name: dto.name, email: dto.email, passwordHash: 'HASH' },
        select: userSelect,
      });
      expect(result).toEqual(userResponse);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws 409 when the e-mail is already registered', async () => {
      hashingMock.hash.mockResolvedValue('HASH');
      prismaMock.user.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('E-mail already registered'),
      );
    });

    it('rethrows unexpected errors untouched (the filter turns them into 500)', async () => {
      const error = new Error('db down');
      hashingMock.hash.mockResolvedValue('HASH');
      prismaMock.user.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('returns the user with watched movie names', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);

      await expect(service.findOne(1)).resolves.toEqual(userResponse);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: userSelect,
      });
    });

    it('throws 404 when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('update', () => {
    it('throws 403 when the token belongs to another user, before touching the database', async () => {
      await expect(
        service.update(1, { name: 'New' }, makeToken(5)),
      ).rejects.toThrow(ForbiddenException);
      expect(hashingMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('updates name and password', async () => {
      hashingMock.hash.mockResolvedValue('NEW_HASH');
      prismaMock.user.update.mockResolvedValue({ ...userFromDb, name: 'New' });

      const result = await service.update(
        1,
        { name: 'New', password: 'new-pass' },
        makeToken(1),
      );

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New', passwordHash: 'NEW_HASH' },
        select: userSelect,
      });
      expect(result).toEqual({ ...userResponse, name: 'New' });
    });

    it('only sends the fields that changed', async () => {
      prismaMock.user.update.mockResolvedValue(userFromDb);

      await service.update(1, { name: 'New' }, makeToken(1));

      expect(hashingMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New' },
        select: userSelect,
      });
    });

    it('throws 404 when the user no longer exists', async () => {
      prismaMock.user.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(1, { name: 'New' }, makeToken(1)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('throws 403 when the token belongs to another user', async () => {
      await expect(service.delete(1, makeToken(5))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('deletes the own user', async () => {
      prismaMock.user.delete.mockResolvedValue({ id: 1 });

      await expect(service.delete(1, makeToken(1))).resolves.toBeUndefined();
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws 404 when the user no longer exists', async () => {
      prismaMock.user.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.delete(1, makeToken(1))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadAvatarImage', () => {
    it.each([
      ['image/png', 'avatar.png', '1.png'],
      ['image/jpeg', 'avatar.jpeg', '1.jpg'],
      ['image/png', '../../evil.html', '1.png'],
    ])(
      'saves mimetype %s (original name %s) as %s',
      async (mimetype, originalname, expectedFileName) => {
        const file = buildFile({ mimetype, originalname });
        prismaMock.user.update.mockResolvedValue({
          ...userFromDb,
          avatar: expectedFileName,
        });

        const result = await service.uploadAvatarImage(makeToken(1), file);

        expect(writeFileMock).toHaveBeenCalledWith(
          path.resolve(process.cwd(), 'files', expectedFileName),
          file.buffer,
        );
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { avatar: expectedFileName },
          select: { ...userSelect, avatar: true },
        });
        expect(result).toEqual({ ...userResponse, avatar: expectedFileName });
      },
    );

    it('rejects unsupported mimetypes with 415 without writing the file', async () => {
      await expect(
        service.uploadAvatarImage(
          makeToken(1),
          buildFile({ mimetype: 'text/html' }),
        ),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('lets file system errors bubble up (500) without updating the user', async () => {
      const error = new Error('disk full');
      writeFileMock.mockRejectedValue(error);

      await expect(
        service.uploadAvatarImage(makeToken(1), buildFile()),
      ).rejects.toBe(error);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});

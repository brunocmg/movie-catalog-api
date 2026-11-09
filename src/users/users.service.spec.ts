import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';

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
  $transaction: jest.fn(),
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const hashingMock = { hash: jest.fn() };
const refreshMock = { revokeAllForUser: jest.fn() };

const prismaError = (code: string) =>
  Object.assign(new Error(code), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  watchedTitles: { select: { title: { select: { name: true } } } },
};

const userFromDb = {
  id: 1,
  name: 'Bruno',
  email: 'bruno@teste.com',
  role: Role.USER,
  avatar: null,
  watchedTitles: [{ title: { name: 'Fight Club' } }],
};

const userResponse = { ...userFromDb, watchedTitles: ['Fight Club'] };

const asUser = (id: number): AuthenticatedUser => ({
  id,
  email: `user${id}@teste.com`,
  role: Role.USER,
});
const asAdmin = (id: number): AuthenticatedUser => ({
  id,
  email: `admin${id}@teste.com`,
  role: Role.ADMIN,
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
    // Array form runs the queries; callback form gets the mock as `tx`.
    prismaMock.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
        : Promise.all(arg as unknown[]),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashingServiceProtocol, useValue: hashingMock },
        { provide: RefreshTokenService, useValue: refreshMock },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('returns a page of users with metadata', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      prismaMock.user.findMany.mockResolvedValue(rows);
      prismaMock.user.count.mockResolvedValue(12);

      const result = await service.findAll({ limit: 2, offset: 4 });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2, skip: 4, orderBy: { id: 'asc' } }),
      );
      expect(result).toEqual({
        data: rows,
        meta: { limit: 2, offset: 4, total: 12 },
      });
    });

    it('never selects the password hash', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            passwordHash: expect.anything() as unknown,
          }) as unknown,
        }),
      );
    });
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
  });

  describe('findOne', () => {
    it('lets users read their own account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);

      await expect(service.findOne(1, asUser(1))).resolves.toEqual(
        userResponse,
      );
    });

    it('lets admins read any account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);

      await expect(service.findOne(1, asAdmin(9))).resolves.toEqual(
        userResponse,
      );
    });

    it("forbids reading someone else's account, before querying", async () => {
      await expect(service.findOne(1, asUser(2))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws 404 when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1, asAdmin(9))).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('update', () => {
    it.each([
      ['another user', asUser(5)],
      ['an admin', asAdmin(5)],
    ])('forbids %s from changing the account', async (_label, requester) => {
      await expect(
        service.update(1, { name: 'New' }, requester),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('updates name and password of the own account', async () => {
      hashingMock.hash.mockResolvedValue('NEW_HASH');
      prismaMock.user.update.mockResolvedValue({ ...userFromDb, name: 'New' });

      const result = await service.update(
        1,
        { name: 'New', password: 'new-pass' },
        asUser(1),
      );

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New', passwordHash: 'NEW_HASH' },
        select: userSelect,
      });
      expect(result).toEqual({ ...userResponse, name: 'New' });
      // a new password ends every session
      expect(refreshMock.revokeAllForUser).toHaveBeenCalledWith(1);
    });

    it('keeps the sessions when only the name changes', async () => {
      prismaMock.user.update.mockResolvedValue(userFromDb);

      await service.update(1, { name: 'New' }, asUser(1));

      expect(refreshMock.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('throws 404 when the user no longer exists', async () => {
      prismaMock.user.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(1, { name: 'New' }, asUser(1)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it("forbids deleting someone else's account", async () => {
      await expect(service.delete(1, asUser(5))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('deletes the own account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: Role.USER });

      await expect(service.delete(1, asUser(1))).resolves.toBeUndefined();
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lets admins delete any account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: Role.USER });

      await service.delete(1, asAdmin(9));

      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('refuses to delete the last admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
      prismaMock.user.count.mockResolvedValue(1);

      await expect(service.delete(9, asAdmin(9))).rejects.toThrow(
        new ConflictException('The last admin cannot be deleted'),
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('deletes an admin when another admin remains', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
      prismaMock.user.count.mockResolvedValue(2);

      await service.delete(9, asAdmin(9));

      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 9 } });
    });

    it('throws 404 when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.delete(1, asAdmin(9))).rejects.toThrow(
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

        const result = await service.uploadAvatarImage(asUser(1), file);

        expect(writeFileMock).toHaveBeenCalledWith(
          path.resolve(process.cwd(), 'files', expectedFileName),
          file.buffer,
        );
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { avatar: expectedFileName },
          select: userSelect,
        });
        expect(result).toEqual({ ...userResponse, avatar: expectedFileName });
      },
    );

    it('rejects unsupported mimetypes with 415 without writing the file', async () => {
      await expect(
        service.uploadAvatarImage(
          asUser(1),
          buildFile({ mimetype: 'text/html' }),
        ),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(writeFileMock).not.toHaveBeenCalled();
    });
  });
});

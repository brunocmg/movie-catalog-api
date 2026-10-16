import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn(),
}));

const writeFileMock = jest.mocked(fs.writeFile);

const prismaMock = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const hashingMock = { hash: jest.fn() };

const userSelect = {
  id: true,
  name: true,
  email: true,
  watchedMovies: { select: { movie: { select: { name: true } } } },
};

// o que o Prisma devolve com o select acima
const userFromDb = {
  id: 1,
  name: 'Bruno',
  email: 'bruno@teste.com',
  watchedMovies: [{ movie: { name: 'Fight Club' } }],
};

// o que o service devolve (filmes mapeados para nomes)
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
  let userService: UsersService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetAllMocks();
    writeFileMock.mockResolvedValue(undefined);
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashingServiceProtocol, useValue: hashingMock },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'bruno@teste.com',
      name: 'Bruno',
      password: '123123',
    };

    it('should hash the password and create the user', async () => {
      hashingMock.hash.mockResolvedValue('HASH_MOCK_EXAMPLE');
      prismaMock.user.create.mockResolvedValue(userFromDb);

      const result = await userService.create(createUserDto);

      expect(hashingMock.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: 'HASH_MOCK_EXAMPLE',
        },
        select: userSelect,
      });
      expect(result).toEqual(userResponse);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw when prisma create fails', async () => {
      hashingMock.hash.mockResolvedValue('HASH_MOCK_EXAMPLE');
      prismaMock.user.create.mockRejectedValue(new Error('Database error'));

      await expect(userService.create(createUserDto)).rejects.toThrow(
        new HttpException(
          'Falha ao cadastrar usuário!',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return the user with watched movie names', async () => {
      prismaMock.user.findFirst.mockResolvedValue(userFromDb);

      const result = await userService.findOne(1);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        select: userSelect,
      });
      expect(result).toEqual(userResponse);
    });

    it('should throw when user is not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(userService.findOne(1)).rejects.toThrow(
        new HttpException('Usuário não encontrado!', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('update', () => {
    const existingUser = { id: 1, name: 'Bruno', passwordHash: 'hash_exemplo' };
    const updateFailure = new HttpException(
      'Falha ao atualizar usuário!',
      HttpStatus.BAD_REQUEST,
    );

    // Hoje o catch genérico do service troca "não existe" e "acesso negado"
    // por esta mesma mensagem. Estes testes devem mudar quando isso for corrigido.
    it('should fail when user is not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        userService.update(1, { name: 'Novo nome' }, makeToken(1)),
      ).rejects.toThrow(updateFailure);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should fail when the token belongs to another user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        userService.update(1, { name: 'Novo nome' }, makeToken(5)),
      ).rejects.toThrow(updateFailure);
      expect(hashingMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should update name and password', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Novo nome',
        password: 'Nova senha',
      };
      prismaMock.user.findFirst.mockResolvedValue(existingUser);
      hashingMock.hash.mockResolvedValue('novo_hash_exemplo');
      prismaMock.user.update.mockResolvedValue({
        ...userFromDb,
        name: 'Novo nome',
      });

      const result = await userService.update(1, updateUserDto, makeToken(1));

      expect(hashingMock.hash).toHaveBeenCalledWith(updateUserDto.password);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Novo nome', passwordHash: 'novo_hash_exemplo' },
        select: userSelect,
      });
      expect(result).toEqual({ ...userResponse, name: 'Novo nome' });
    });

    it('should keep the current password hash when no password is sent', async () => {
      prismaMock.user.findFirst.mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue(userFromDb);

      await userService.update(1, { name: 'Novo nome' }, makeToken(1));

      expect(hashingMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Novo nome', passwordHash: 'hash_exemplo' },
        select: userSelect,
      });
    });
  });

  describe('delete', () => {
    const deleteFailure = new HttpException(
      'Falha ao deletar usuário!',
      HttpStatus.BAD_REQUEST,
    );

    it('should fail when user is not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(userService.delete(1, makeToken(1))).rejects.toThrow(
        deleteFailure,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('should fail when the token belongs to another user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 1 });

      await expect(userService.delete(1, makeToken(5))).rejects.toThrow(
        deleteFailure,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('should delete the user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.user.delete.mockResolvedValue({ id: 1 });

      const result = await userService.delete(1, makeToken(1));

      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'Usuário foi deletado com sucesso!' });
    });
  });

  describe('uploadAvatarImage', () => {
    const avatarFailure = new HttpException(
      'Falha ao atualizar o avatar do usuário!',
      HttpStatus.BAD_REQUEST,
    );

    it.each([
      ['image/png', 'avatar.png', '1.png'],
      ['image/jpeg', 'avatar.jpeg', '1.jpg'],
      ['image/png', 'evil.html', '1.png'], // a extensão vem do mimetype, não do nome
    ])(
      'should save mimetype %s (original name %s) as %s',
      async (mimetype, originalname, expectedFileName) => {
        const file = buildFile({ mimetype, originalname });
        prismaMock.user.findFirst.mockResolvedValue({ id: 1 });
        prismaMock.user.update.mockResolvedValue({
          ...userFromDb,
          avatar: expectedFileName,
        });

        const result = await userService.uploadAvatarImage(makeToken(1), file);

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

    it('should reject unsupported mimetypes without writing the file', async () => {
      const file = buildFile({ mimetype: 'text/html' });

      await expect(
        userService.uploadAvatarImage(makeToken(1), file),
      ).rejects.toBeInstanceOf(HttpException);
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should fail when user is not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        userService.uploadAvatarImage(makeToken(1), buildFile()),
      ).rejects.toThrow(avatarFailure);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should fail when writing the file fails', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 1 });
      writeFileMock.mockRejectedValue(new Error('Fail write error'));

      await expect(
        userService.uploadAvatarImage(makeToken(1), buildFile()),
      ).rejects.toThrow(avatarFailure);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});

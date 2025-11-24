import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { UsersService } from './users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';

describe('UsersService', () => {
  let userService: UsersService;
  let prismaService: PrismaService;
  let hashingService: HashingServiceProtocol;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn().mockResolvedValue({
                id: 1,
                name: 'Bruno',
                email: 'bruno@teste.com',
                createAt: new Date(),
              }),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: HashingServiceProtocol,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    hashingService = module.get<HashingServiceProtocol>(HashingServiceProtocol);
  });

  describe('Create User', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'bruno@teste.com',
        name: 'Bruno',
        password: '123123',
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXAMPLE');

      const result = await userService.create(createUserDto);

      expect(hashingService.hash).toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: 'HASH_MOCK_EXAMPLE',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(result).toMatchObject({
        id: 1,
        name: createUserDto.name,
        email: createUserDto.email,
      });
    });

    it('should throw error if prisma create fails', async () => {
      const createUserDto: CreateUserDto = {
        email: 'bruno@teste.com',
        name: 'Bruno',
        password: '123123',
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXAMPLE');
      jest
        .spyOn(prismaService.user, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(userService.create(createUserDto)).rejects.toThrow(
        new HttpException(
          'Falha ao cadastrar usuário!',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(hashingService.hash).toHaveBeenCalledWith(createUserDto.password);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: 'HASH_MOCK_EXAMPLE',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    });
  });

  describe('Find One User', () => {
    it('should return a user when found', async () => {
      const mockUser = {
        id: 1,
        name: 'Bruno',
        email: 'bruno@teste.com',
        passwordHash: 'hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const result = await userService.findOne(1);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw exception when user is not found', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.findOne(1)).rejects.toThrow(
        new HttpException('Usuário não encontrado!', HttpStatus.BAD_REQUEST),
      );

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    });
  });

  describe('Update User', () => {
    it('should throw exception when user is not found', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Novo nome' };
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        userService.update(1, updateUserDto, tokenPayload),
      ).rejects.toThrow(
        new HttpException(
          'Falha ao atualizar usuário!',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw UNAUTHORIZED exception when user is not authorized', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Novo nome' };
      const tokenPayload: PayloadTokenDto = {
        sub: 5,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        passwordHash: 'hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      await expect(
        userService.update(1, updateUserDto, tokenPayload),
      ).rejects.toThrow(
        new HttpException(
          'Falha ao atualizar usuário!',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should user updated', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Novo nome',
        password: 'Nova senha',
      };
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'bruno@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Bruno',
        email: 'bruno@teste.com',
        passwordHash: 'hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      const updatedUser = {
        id: 1,
        name: 'Novo nome',
        email: 'bruno@teste.com',
        passwordHash: 'novo_hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(hashingService, 'hash').mockResolvedValue('novo_hash_exemplo');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await userService.update(1, updateUserDto, tokenPayload);

      expect(hashingService.hash).toHaveBeenCalledWith(updateUserDto.password);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          name: updateUserDto.name,
          passwordHash: 'novo_hash_exemplo',
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(result).toEqual(updatedUser);
    });
  });

  describe('Delete User', () => {
    it('should throw error when user is not found', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(userService.delete(1, tokenPayload)).rejects.toThrow(
        new HttpException('Falha ao deletar usuário!', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw UNAUTHORIZED when user is not authorized', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 5,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        passwordHash: 'hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      await expect(userService.delete(1, tokenPayload)).rejects.toThrow(
        new HttpException('Falha ao deletar usuário!', HttpStatus.BAD_REQUEST),
      );

      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });

    it('should delete user', async () => {
      const tokenPayload: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'matheus@teste.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const mockUser = {
        id: 1,
        name: 'Matheus',
        email: 'matheus@teste.com',
        passwordHash: 'hash_exemplo',
        active: true,
        createAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValue(mockUser);

      const result = await userService.delete(1, tokenPayload);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: {
          id: mockUser.id,
        },
      });

      expect(result).toEqual({
        message: 'Usuário foi deletado com sucesso!',
      });
    });
  })
});

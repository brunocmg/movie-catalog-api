import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import { ResponseFindOneUser } from './dto/response-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findOne(id: number): Promise<ResponseFindOneUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (user) return user;

    throw new HttpException('Usuário não encontrado!', HttpStatus.BAD_REQUEST);
  }

  async create(CreateUserDto: CreateUserDto): Promise<ResponseFindOneUser> {
    try {
      const passwordHash = await this.hashingService.hash(
        CreateUserDto.password,
      );

      const user = await this.prisma.user.create({
        data: {
          name: CreateUserDto.name,
          email: CreateUserDto.email,
          passwordHash: passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return user;
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Falha ao cadastrar usuário!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseFindOneUser> {
    console.log(tokenPayload);
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: id,
        },
      });

      if (!user) {
        throw new HttpException('Usuário não existe!', HttpStatus.BAD_REQUEST);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Acesso negado', HttpStatus.BAD_REQUEST);
      }

      const dataUser: { name?: string; passwordHash?: string } = {
        name: updateUserDto.name ? updateUserDto.name : user.name,
      };

      if (updateUserDto?.password) {
        const passwordHash = await this.hashingService.hash(
          updateUserDto?.password,
        );
        dataUser['passwordHash'] = passwordHash;
      }

      const updateUser = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          name: dataUser.name,
          passwordHash: dataUser?.passwordHash
            ? dataUser?.passwordHash
            : user.passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return updateUser;
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Falha ao atualizar usuário!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async delete(id: number, tokenPayload: PayloadTokenDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: id,
        },
      });

      if (!user) {
        throw new HttpException('Usuário não existe!', HttpStatus.BAD_REQUEST);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Acesso negado', HttpStatus.BAD_REQUEST);
      }

      await this.prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      return {
        message: 'Usuário foi deletado com sucesso!',
      };
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Falha ao deletar usuário!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

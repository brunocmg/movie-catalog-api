import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';
import {
  ResponseUpdateAvatarDto,
  ResponseUserDto,
} from './dto/response-user.dto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

type MovieName = {
  name: string;
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findOne(id: number): Promise<ResponseUserDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        watchedMovies: {
          select: {
            name: true,
          },
        },
      },
    });

    if (user) {
      const movieNames = (user.watchedMovies as MovieName[]).map((m) => m.name);
      return {
        ...user,
        watchedMovies: movieNames,
      };
    }

    throw new HttpException('Usuário não encontrado!', HttpStatus.BAD_REQUEST);
  }

  async create(CreateUserDto: CreateUserDto): Promise<ResponseUserDto> {
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
          watchedMovies: {
            select: {
              name: true,
            },
          },
        },
      });

      const movieNames = (user.watchedMovies as MovieName[]).map((m) => m.name);
      return {
        ...user,
        watchedMovies: movieNames,
      };
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
  ): Promise<ResponseUserDto> {
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
          watchedMovies: {
            select: {
              name: true,
            },
          },
        },
      });

      const movieNames = (updateUser.watchedMovies as MovieName[]).map(
        (m) => m.name,
      );
      return {
        ...updateUser,
        watchedMovies: movieNames,
      };
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

  async uploadAvatarImage(
    tokenPayload: PayloadTokenDto,
    file: UploadedAvatarFile,
  ): Promise<ResponseUpdateAvatarDto> {
    try {
      const fileExtension = path
        .extname(file.originalname)
        .toLowerCase()
        .substring(1);

      const fileName = `${tokenPayload.sub}.${fileExtension}`;

      const fileLocale = path.resolve(process.cwd(), 'files', fileName);

      await fs.writeFile(fileLocale, file.buffer);

      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException(
          'Falha ao atualizar o avatar do usuário!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          avatar: fileName,
        },
        select: {
          id: true,
          name: true,
          email: true,
          watchedMovies: {
            select: {
              name: true,
            },
          },
          avatar: true,
        },
      });

      const movieNames = (updatedUser.watchedMovies as MovieName[]).map(
        (m) => m.name,
      );
      return {
        ...updatedUser,
        watchedMovies: movieNames,
      };
    } catch {
      throw new HttpException(
        'Falha ao atualizar o avatar do usuário!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

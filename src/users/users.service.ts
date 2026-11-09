import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ResponseUpdateAvatarDto,
  ResponseUserDto,
} from './dto/response-user.dto';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  watchedMovies: { select: { movie: { select: { name: true } } } },
} as const;

type SelectedUser = {
  id: number;
  name: string;
  email: string;
  watchedMovies: { movie: { name: string } }[];
};

function toResponse<T extends SelectedUser>(
  user: T,
): Omit<T, 'watchedMovies'> & { watchedMovies: string[] } {
  return {
    ...user,
    watchedMovies: user.watchedMovies.map((w) => w.movie.name),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findOne(id: number): Promise<ResponseUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) throw new NotFoundException('User not found');

    return toResponse(user);
  }

  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const passwordHash = await this.hashingService.hash(createUserDto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash,
        },
        select: userSelect,
      });
      return toResponse(user);
    } catch (err) {
      if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
        throw new ConflictException('E-mail already registered');
      }
      throw err;
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    tokenPayload: PayloadTokenDto,
  ): Promise<ResponseUserDto> {
    this.assertOwner(id, tokenPayload);

    const data: { name?: string; passwordHash?: string } = {};
    if (updateUserDto.name) data.name = updateUserDto.name;
    if (updateUserDto.password) {
      data.passwordHash = await this.hashingService.hash(
        updateUserDto.password,
      );
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
      return toResponse(user);
    } catch (err) {
      throw this.notFoundOr(err);
    }
  }

  async delete(id: number, tokenPayload: PayloadTokenDto): Promise<void> {
    this.assertOwner(id, tokenPayload);

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      throw this.notFoundOr(err);
    }
  }

  async uploadAvatarImage(
    tokenPayload: PayloadTokenDto,
    file: UploadedAvatarFile,
  ): Promise<ResponseUpdateAvatarDto> {
    const extension = EXTENSION_BY_MIMETYPE[file.mimetype];
    if (!extension) {
      throw new UnsupportedMediaTypeException('Only JPEG and PNG are allowed');
    }

    // The file name comes from the user id and the validated mimetype, never
    // from the uploaded name, so it cannot be used for path traversal.
    const fileName = `${tokenPayload.sub}.${extension}`;
    const uploadDir = path.resolve(process.cwd(), 'files');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), file.buffer);

    try {
      const user = await this.prisma.user.update({
        where: { id: tokenPayload.sub },
        data: { avatar: fileName },
        select: { ...userSelect, avatar: true },
      });
      return toResponse(user);
    } catch (err) {
      throw this.notFoundOr(err);
    }
  }

  private assertOwner(id: number, tokenPayload: PayloadTokenDto) {
    if (id !== tokenPayload.sub) {
      throw new ForbiddenException('You can only change your own account');
    }
  }

  private notFoundOr(err: unknown): unknown {
    return isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)
      ? new NotFoundException('User not found')
      : err;
  }
}

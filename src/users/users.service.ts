import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsersDto, ResponseUserDto } from './dto/response-user.dto';

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
  role: true,
  avatar: true,
  watchedMovies: { select: { movie: { select: { name: true } } } },
} as const;

type SelectedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  watchedMovies: { movie: { name: string } }[];
};

function toResponse(user: SelectedUser): ResponseUserDto {
  return {
    ...user,
    watchedMovies: user.watchedMovies.map((w) => w.movie.name),
  };
}

const isAdmin = (user: AuthenticatedUser) => user.role === Role.ADMIN;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedUsersDto> {
    const { limit = 10, offset = 0 } = pagination;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { id: 'asc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return { data, meta: { limit, offset, total } };
  }

  /** Owners can read their own account; admins can read any account. */
  async findOne(
    id: number,
    requester: AuthenticatedUser,
  ): Promise<ResponseUserDto> {
    if (id !== requester.id && !isAdmin(requester)) {
      throw new ForbiddenException('You can only access your own account');
    }

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

  /** Only the owner: not even an admin changes someone else's password. */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    requester: AuthenticatedUser,
  ): Promise<ResponseUserDto> {
    if (id !== requester.id) {
      throw new ForbiddenException('You can only change your own account');
    }

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

  /** Owners can delete their own account; admins can delete any account. */
  async delete(id: number, requester: AuthenticatedUser): Promise<void> {
    if (id !== requester.id && !isAdmin(requester)) {
      throw new ForbiddenException('You can only delete your own account');
    }

    await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true },
      });
      if (!target) throw new NotFoundException('User not found');

      if (target.role === Role.ADMIN) {
        const admins = await tx.user.count({ where: { role: Role.ADMIN } });
        if (admins <= 1) {
          throw new ConflictException('The last admin cannot be deleted');
        }
      }

      await tx.user.delete({ where: { id } });
    });
  }

  async uploadAvatarImage(
    requester: AuthenticatedUser,
    file: UploadedAvatarFile,
  ): Promise<ResponseUserDto> {
    const extension = EXTENSION_BY_MIMETYPE[file.mimetype];
    if (!extension) {
      throw new UnsupportedMediaTypeException('Only JPEG and PNG are allowed');
    }

    // The file name comes from the user id and the validated mimetype, never
    // from the uploaded name, so it cannot be used for path traversal.
    const fileName = `${requester.id}.${extension}`;
    const uploadDir = path.resolve(process.cwd(), 'files');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), file.buffer);

    try {
      const user = await this.prisma.user.update({
        where: { id: requester.id },
        data: { avatar: fileName },
        select: userSelect,
      });
      return toResponse(user);
    } catch (err) {
      throw this.notFoundOr(err);
    }
  }

  private notFoundOr(err: unknown): unknown {
    return isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)
      ? new NotFoundException('User not found')
      : err;
  }
}

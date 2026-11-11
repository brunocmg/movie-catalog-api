import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CacheService } from '../cache/cache.service';
import { detectImageType } from '../storage/image';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsersDto, ResponseUserDto } from './dto/response-user.dto';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  watchedTitles: { select: { title: { select: { name: true } } } },
} as const;

type SelectedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  watchedTitles: { title: { name: string } }[];
};

function toResponse(user: SelectedUser): ResponseUserDto {
  return {
    ...user,
    watchedTitles: user.watchedTitles.map((w) => w.title.name),
  };
}

const isAdmin = (user: AuthenticatedUser) => user.role === Role.ADMIN;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
    private readonly refreshTokens: RefreshTokenService,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
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

    let user: SelectedUser;
    try {
      user = await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
    } catch (err) {
      throw this.notFoundOr(err);
    }

    if (data.passwordHash) await this.refreshTokens.revokeAllForUser(id);

    return toResponse(user);
  }

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
    // the user's ratings went with the account
    await this.cache.invalidate();

    await this.storage.deleteImage('avatars', String(id)).catch((err) => {
      this.logger.warn(
        `Could not remove the avatar of user ${id}: ${String(err)}`,
      );
    });
  }

  async uploadAvatarImage(
    requester: AuthenticatedUser,
    file: UploadedAvatarFile,
  ): Promise<ResponseUserDto> {
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new UnsupportedMediaTypeException(
        'Only JPEG, PNG and WebP images are allowed',
      );
    }

    // named after the user id, never after the uploaded name
    const avatar = await this.storage.saveImage({
      folder: 'avatars',
      name: String(requester.id),
      buffer: file.buffer,
      type,
    });

    try {
      const user = await this.prisma.user.update({
        where: { id: requester.id },
        data: { avatar },
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

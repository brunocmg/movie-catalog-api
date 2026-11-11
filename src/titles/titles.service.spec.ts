import { Test } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { TitleType } from '@prisma/client';
import { TitlesService } from './titles.service';
import { SortOrder, TitleSortBy } from './dto/title-search.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StorageService } from '../storage/storage.service';

const prismaMock = {
  $transaction: jest.fn(),
  title: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const cacheMock = {
  wrap: jest.fn((_key: string, loader: () => Promise<unknown>) => loader()),
  invalidate: jest.fn(),
};

const storageMock = {
  saveImage: jest.fn(),
  deleteImage: jest.fn(),
};

const prismaError = (code: string) =>
  Object.assign(new Error(code), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

const row = {
  id: 1,
  type: TitleType.MOVIE,
  name: 'Heat',
  year: 1995,
  genres: [{ genre: { name: 'Crime' } }, { genre: { name: 'Drama' } }],
};

describe('TitlesService', () => {
  let service: TitlesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    cacheMock.wrap.mockImplementation((_key, loader) => loader());
    prismaMock.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );

    const module = await Test.createTestingModule({
      providers: [
        TitlesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
        { provide: CacheService, useValue: cacheMock },
      ],
    }).compile();

    service = module.get(TitlesService);
  });

  it('flattens genres to names in responses', async () => {
    prismaMock.title.findFirst.mockResolvedValue(row);

    await expect(service.findOne(1)).resolves.toMatchObject({
      name: 'Heat',
      genres: ['Crime', 'Drama'],
    });
  });

  describe('create', () => {
    it('connects or creates one genre per slug', async () => {
      prismaMock.title.create.mockResolvedValue(row);

      await service.create(TitleType.MOVIE, {
        name: 'Heat',
        year: 1995,
        genres: ['Ação', 'acao', 'Sci-Fi'],
      });

      const data = (
        prismaMock.title.create.mock.calls[0] as [
          { data: { type: string; genres: { create: unknown[] } } },
        ]
      )[0].data;
      expect(data.type).toBe('MOVIE');
      expect(data.genres.create).toEqual([
        {
          genre: {
            connectOrCreate: {
              where: { slug: 'acao' },
              create: { slug: 'acao', name: 'Ação' },
            },
          },
        },
        {
          genre: {
            connectOrCreate: {
              where: { slug: 'sci-fi' },
              create: { slug: 'sci-fi', name: 'Sci-Fi' },
            },
          },
        },
      ]);
    });

    it('does not touch genres when none are sent', async () => {
      prismaMock.title.create.mockResolvedValue(row);

      await service.create(TitleType.MOVIE, { name: 'Heat', year: 1995 });

      expect(prismaMock.title.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ genres: undefined }) as object,
        }),
      );
    });

    it('throws 409 for a duplicated name, year and type', async () => {
      prismaMock.title.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(TitleType.SERIES, { name: 'Dark', year: 2017 }),
      ).rejects.toThrow(
        new ConflictException(
          'A series with this name and year already exists',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('builds the where and order from the search params', async () => {
      prismaMock.title.findMany.mockResolvedValue([]);
      prismaMock.title.count.mockResolvedValue(0);

      await service.findAll({
        q: '50%_off',
        genre: 'Ficção Científica',
        yearFrom: 1990,
        sortBy: TitleSortBy.Year,
        order: SortOrder.Desc,
      });

      expect(prismaMock.title.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: '50\\%\\_off', mode: 'insensitive' },
            genres: { some: { genre: { slug: 'ficcao-cientifica' } } },
            year: { gte: 1990, lte: undefined },
          },
          orderBy: [{ year: 'desc' }, { id: 'asc' }],
        }),
      );
    });

    it('filters by type and counts with the same filter', async () => {
      prismaMock.title.findMany.mockResolvedValue([row]);
      prismaMock.title.count.mockResolvedValue(7);

      const result = await service.findAll(
        { limit: 5, offset: 10 },
        TitleType.SERIES,
      );

      expect(prismaMock.title.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: TitleType.SERIES },
          take: 5,
          skip: 10,
        }),
      );
      expect(prismaMock.title.count).toHaveBeenCalledWith({
        where: { type: TitleType.SERIES },
      });
      expect(result.meta).toEqual({ limit: 5, offset: 10, total: 7 });
    });
  });

  describe('update and remove', () => {
    it('scope the lookup by type, so a series is not a movie', async () => {
      prismaMock.title.update.mockRejectedValue(prismaError('P2025'));
      prismaMock.title.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(1, TitleType.MOVIE, { year: 2000 }),
      ).rejects.toThrow(new NotFoundException('Movie not found'));
      await expect(service.remove(1, TitleType.MOVIE)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.title.delete).toHaveBeenCalledWith({
        where: { id: 1, type: TitleType.MOVIE },
      });
    });

    it('replaces genres only when they are sent', async () => {
      prismaMock.title.update.mockResolvedValue(row);

      await service.update(1, TitleType.MOVIE, { genres: ['Drama'] });
      await service.update(1, TitleType.MOVIE, { year: 2000 });

      const calls = prismaMock.title.update.mock.calls as [
        { data: { genres?: { deleteMany: object } } },
      ][];
      expect(calls[0][0].data.genres?.deleteMany).toEqual({});
      expect(calls[1][0].data.genres).toBeUndefined();
    });
  });

  describe('posters', () => {
    const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

    it('stores the image and saves its URL on the title', async () => {
      prismaMock.title.findFirst.mockResolvedValue(row);
      storageMock.saveImage.mockResolvedValue('https://cdn.example/posters/1');
      prismaMock.title.update.mockResolvedValue({
        ...row,
        posterUrl: 'https://cdn.example/posters/1',
      });

      const res = await service.setPoster(1, PNG);

      expect(storageMock.saveImage).toHaveBeenCalledWith({
        folder: 'posters',
        name: '1',
        buffer: PNG,
        type: 'png',
      });
      expect(res.posterUrl).toBe('https://cdn.example/posters/1');
    });

    it('rejects files that are not images without storing them', async () => {
      await expect(
        service.setPoster(1, Buffer.from('not an image')),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(storageMock.saveImage).not.toHaveBeenCalled();
    });

    it('does not store a poster for an unknown title', async () => {
      prismaMock.title.findFirst.mockResolvedValue(null);

      await expect(service.setPoster(9, PNG)).rejects.toThrow(
        NotFoundException,
      );
      expect(storageMock.saveImage).not.toHaveBeenCalled();
    });

    it('removes the stored poster when the title is deleted', async () => {
      prismaMock.title.delete.mockResolvedValue(row);
      storageMock.deleteImage.mockResolvedValue(undefined);

      await service.remove(1, TitleType.MOVIE);

      expect(storageMock.deleteImage).toHaveBeenCalledWith('posters', '1');
    });

    it('still deletes the title when the storage cleanup fails', async () => {
      prismaMock.title.delete.mockResolvedValue(row);
      storageMock.deleteImage.mockRejectedValue(new Error('down'));

      await expect(service.remove(1, TitleType.MOVIE)).resolves.toBeUndefined();
    });
  });
});

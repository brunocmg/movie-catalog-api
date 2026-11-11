import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  $transaction: jest.fn(),
  title: { findUnique: jest.fn() },
  favorite: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('FavoritesService', () => {
  let service: FavoritesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const module = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(FavoritesService);
  });

  it('does not favorite a title that does not exist', async () => {
    prismaMock.title.findUnique.mockResolvedValue(null);

    await expect(service.add(1, 9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.favorite.upsert).not.toHaveBeenCalled();
  });

  it('upserts so that adding twice is harmless', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ id: 9 });

    await service.add(1, 9);

    expect(prismaMock.favorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });

  it('maps rows and applies default pagination', async () => {
    const createdAt = new Date();
    prismaMock.favorite.findMany.mockResolvedValue([
      { createdAt, title: { id: 9, name: 'Heat', genres: [] } },
    ]);
    prismaMock.favorite.count.mockResolvedValue(1);

    const res = await service.list(1, {});

    expect(res.meta).toEqual({ limit: 10, offset: 0, total: 1 });
    expect(res.data[0]).toMatchObject({
      favoritedAt: createdAt,
      title: { id: 9, genres: [] },
    });
  });
});

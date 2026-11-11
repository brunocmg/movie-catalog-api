import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

const cacheMock = {
  wrap: jest.fn((_key: string, loader: () => Promise<unknown>) => loader()),
  invalidate: jest.fn(),
};

const prismaMock = {
  $transaction: jest.fn(),
  title: { findUnique: jest.fn() },
  rating: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('RatingsService', () => {
  let service: RatingsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const module = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CacheService, useValue: cacheMock },
      ],
    }).compile();
    service = module.get(RatingsService);
  });

  it('does not rate a title that does not exist', async () => {
    prismaMock.title.findUnique.mockResolvedValue(null);

    await expect(service.rate(1, 9, { score: 5 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.rating.upsert).not.toHaveBeenCalled();
  });

  it('stores an empty review as null', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ id: 9 });

    await service.rate(1, 9, { score: 5, review: '' });

    expect(prismaMock.rating.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { score: 5, review: null },
        create: { userId: 1, titleId: 9, score: 5, review: null },
      }),
    );
  });

  it('answers 404 when there is no own rating', async () => {
    prismaMock.rating.findUnique.mockResolvedValue(null);

    await expect(service.findMine(1, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('only lists ratings that have a review', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ id: 9 });
    prismaMock.rating.findMany.mockResolvedValue([]);
    prismaMock.rating.count.mockResolvedValue(0);

    await service.listReviews(9, {});

    expect(prismaMock.rating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { titleId: 9, review: { not: null } },
      }),
    );
  });

  it('removing is a plain delete scoped to the user', async () => {
    prismaMock.rating.deleteMany.mockResolvedValue({ count: 1 });

    await service.remove(1, 9);

    expect(prismaMock.rating.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, titleId: 9 },
    });
    expect(cacheMock.invalidate).toHaveBeenCalledTimes(1);
  });

  it('keeps the cache when there was nothing to remove', async () => {
    prismaMock.rating.deleteMany.mockResolvedValue({ count: 0 });

    await service.remove(1, 9);

    expect(cacheMock.invalidate).not.toHaveBeenCalled();
  });

  it('drops the cached titles after rating', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ id: 9 });
    prismaMock.rating.upsert.mockResolvedValue({});

    await service.rate(1, 9, { score: 5 });

    expect(cacheMock.invalidate).toHaveBeenCalledTimes(1);
  });
});

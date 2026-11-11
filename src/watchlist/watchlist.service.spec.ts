import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { WatchlistService } from './watchlist.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  $transaction: jest.fn(),
  title: { findUnique: jest.fn() },
  watchlistItem: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('WatchlistService', () => {
  let service: WatchlistService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const module = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(WatchlistService);
  });

  it('does not add a title that does not exist', async () => {
    prismaMock.title.findUnique.mockResolvedValue(null);

    await expect(service.add(1, 9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.watchlistItem.upsert).not.toHaveBeenCalled();
  });

  it('passes the priority to the upsert and leaves it alone when omitted', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ id: 9 });

    await service.add(1, 9, Priority.HIGH);
    await service.add(1, 9);

    expect(prismaMock.watchlistItem.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ update: { priority: Priority.HIGH } }),
    );
    expect(prismaMock.watchlistItem.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ update: { priority: undefined } }),
    );
  });

  it('maps rows and applies default pagination', async () => {
    const addedAt = new Date();
    prismaMock.watchlistItem.findMany.mockResolvedValue([
      {
        priority: Priority.LOW,
        addedAt,
        title: { id: 9, name: 'Heat', genres: [] },
      },
    ]);
    prismaMock.watchlistItem.count.mockResolvedValue(1);

    const res = await service.list(1, {});

    expect(res.meta).toEqual({ limit: 10, offset: 0, total: 1 });
    expect(res.data[0]).toMatchObject({
      priority: Priority.LOW,
      addedAt,
      title: { id: 9, genres: [] },
    });
  });
});

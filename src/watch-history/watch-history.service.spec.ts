import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import { WatchHistoryService } from './watch-history.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  title: { findUnique: jest.fn(), findFirst: jest.fn() },
  episode: { findUnique: jest.fn(), findMany: jest.fn() },
  watchedTitle: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  watchedEpisode: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('WatchHistoryService', () => {
  let service: WatchHistoryService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
        : Promise.all(arg as unknown[]),
    );
    const module = await Test.createTestingModule({
      providers: [
        WatchHistoryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(WatchHistoryService);
  });

  it('does not mark a title that does not exist', async () => {
    prismaMock.title.findUnique.mockResolvedValue(null);

    await expect(service.markTitle(1, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.watchedTitle.upsert).not.toHaveBeenCalled();
  });

  it('only touches the title row when marking a movie', async () => {
    prismaMock.title.findUnique.mockResolvedValue({ type: TitleType.MOVIE });

    await service.markTitle(1, 9);

    expect(prismaMock.watchedTitle.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps the series while other episodes remain watched', async () => {
    prismaMock.episode.findUnique.mockResolvedValue({ season: { titleId: 5 } });
    prismaMock.watchedEpisode.count.mockResolvedValue(2);

    await service.unmarkEpisode(1, 10);

    expect(prismaMock.watchedTitle.deleteMany).not.toHaveBeenCalled();
  });

  it('removes the series when the last watched episode is unmarked', async () => {
    prismaMock.episode.findUnique.mockResolvedValue({ season: { titleId: 5 } });
    prismaMock.watchedEpisode.count.mockResolvedValue(0);

    await service.unmarkEpisode(1, 10);

    expect(prismaMock.watchedTitle.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, titleId: 5 },
    });
  });

  it('reports progress zero for a series without episodes', async () => {
    prismaMock.watchedTitle.findUnique.mockResolvedValue({
      watchedAt: new Date(),
      title: {
        id: 5,
        type: TitleType.SERIES,
        name: 'X',
        year: 2000,
        genres: [],
      },
    });
    prismaMock.$queryRaw.mockResolvedValue([]);

    const res = await service.findOne(1, 5);

    expect(res.progress).toEqual({ watched: 0, total: 0 });
  });
});

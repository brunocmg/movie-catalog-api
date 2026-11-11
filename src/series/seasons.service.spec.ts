import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  title: { findFirst: jest.fn() },
  season: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  episode: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const prismaError = (code: string) =>
  Object.assign(new Error(code), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

const seasonRow = {
  id: 1,
  titleId: 5,
  number: 1,
  name: null,
  _count: { episodes: 3 },
};

describe('SeasonsService', () => {
  let service: SeasonsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SeasonsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(SeasonsService);
  });

  it('maps the episode count of a season', async () => {
    prismaMock.title.findFirst.mockResolvedValue({ id: 5 });
    prismaMock.season.findMany.mockResolvedValue([seasonRow]);

    const [season] = await service.listSeasons(5);

    expect(season.episodeCount).toBe(3);
    expect(season).not.toHaveProperty('_count');
  });

  it('does not list seasons of something that is not a series', async () => {
    prismaMock.title.findFirst.mockResolvedValue(null);

    await expect(service.listSeasons(5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.season.findMany).not.toHaveBeenCalled();
  });

  it('translates a duplicate season number into 409', async () => {
    prismaMock.title.findFirst.mockResolvedValue({ id: 5 });
    prismaMock.season.create.mockRejectedValue(prismaError('P2002'));

    await expect(service.createSeason(5, { number: 1 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('translates a missing season on update and delete into 404', async () => {
    prismaMock.season.update.mockRejectedValue(prismaError('P2025'));
    prismaMock.season.delete.mockRejectedValue(prismaError('P2025'));

    await expect(service.updateSeason(1, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.removeSeason(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('checks the season before adding an episode', async () => {
    prismaMock.season.findUnique.mockResolvedValue(null);

    await expect(
      service.createEpisode(1, { number: 1, name: 'Pilot' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.episode.create).not.toHaveBeenCalled();
  });

  it('translates a duplicate episode number into 409', async () => {
    prismaMock.season.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.episode.create.mockRejectedValue(prismaError('P2002'));

    await expect(
      service.createEpisode(1, { number: 1, name: 'Pilot' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

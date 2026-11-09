import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MoviesService } from './movies.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  movie: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: 'test',
  });

describe('MoviesService', () => {
  let service: MoviesService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(MoviesService);
  });

  describe('create', () => {
    it('throws 409 for a duplicated name and year', async () => {
      prismaMock.movie.create.mockRejectedValue(knownError('P2002'));

      await expect(
        service.create({ name: 'Dune', year: 2021 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws 404 when the movie does not exist', async () => {
      prismaMock.movie.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(
        new NotFoundException('Movie not found'),
      );
    });
  });

  describe('update', () => {
    it('sends only the provided fields', async () => {
      prismaMock.movie.update.mockResolvedValue({ id: 1 });

      await service.update(1, { director: 'Michael Mann' });

      expect(prismaMock.movie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: undefined,
          genre: undefined,
          director: 'Michael Mann',
          year: undefined,
        },
      });
    });

    it.each([
      ['P2025', NotFoundException],
      ['P2002', ConflictException],
    ])('maps prisma %s to %p', async (code, expected) => {
      prismaMock.movie.update.mockRejectedValue(knownError(code));

      await expect(service.update(1, { year: 2000 })).rejects.toThrow(expected);
    });
  });

  describe('remove', () => {
    it('deletes the movie', async () => {
      prismaMock.movie.delete.mockResolvedValue({ id: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(prismaMock.movie.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('throws 404 when the movie does not exist (P2025)', async () => {
      prismaMock.movie.delete.mockRejectedValue(knownError('P2025'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('rethrows any other error untouched', async () => {
      const error = new Error('db down');
      prismaMock.movie.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toBe(error);
    });
  });
});

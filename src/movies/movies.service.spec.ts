import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MoviesService } from './movies.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = { movie: { delete: jest.fn() } };

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

  describe('remove', () => {
    it('should delete and return the movie', async () => {
      const movie = { id: 1, name: 'Fight Club', year: 1999 };
      prismaMock.movie.delete.mockResolvedValue(movie);

      await expect(service.remove(1)).resolves.toEqual(movie);
      expect(prismaMock.movie.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when the movie does not exist (P2025)', async () => {
      prismaMock.movie.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should rethrow any other error untouched', async () => {
      const error = new Error('db down');
      prismaMock.movie.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toBe(error);
    });
  });
});

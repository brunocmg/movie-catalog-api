import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  MAX_ITEMS_PER_LIST,
  MAX_LISTS_PER_USER,
  ListsService,
} from './lists.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  $transaction: jest.fn(),
  title: { findUnique: jest.fn() },
  list: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  listItem: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const prismaError = (code: string) =>
  Object.assign(new Error(code), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

const viewer = { id: 7, email: 'a@a.com', role: Role.USER };

describe('ListsService', () => {
  let service: ListsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const module = await Test.createTestingModule({
      providers: [
        ListsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(ListsService);
  });

  describe('create', () => {
    it('refuses the list past the per-user limit', async () => {
      prismaMock.list.count.mockResolvedValue(MAX_LISTS_PER_USER);

      await expect(service.create(7, { name: 'x' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.list.create).not.toHaveBeenCalled();
    });

    it('turns a duplicate name into 409', async () => {
      prismaMock.list.count.mockResolvedValue(0);
      prismaMock.list.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(7, { name: 'x' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('visibility', () => {
    it('only looks for public lists when anonymous', async () => {
      prismaMock.list.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.list.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, isPublic: true } }),
      );
    });

    it('also looks for the own lists when logged in', async () => {
      prismaMock.list.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, viewer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.list.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, OR: [{ isPublic: true }, { userId: 7 }] },
        }),
      );
    });

    it('does not list the items of a list that cannot be read', async () => {
      prismaMock.list.findFirst.mockResolvedValue(null);

      await expect(service.listItems(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.listItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      prismaMock.list.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.title.findUnique.mockResolvedValue({ id: 9 });
      prismaMock.listItem.findUnique.mockResolvedValue(null);
      prismaMock.listItem.count.mockResolvedValue(0);
    });

    it('requires the list to belong to the user', async () => {
      prismaMock.list.findFirst.mockResolvedValue(null);

      await expect(service.addItem(7, 1, 9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.list.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 7 } }),
      );
    });

    it('does not add a title that does not exist', async () => {
      prismaMock.title.findUnique.mockResolvedValue(null);

      await expect(service.addItem(7, 1, 9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('does nothing when the title is already there', async () => {
      prismaMock.listItem.findUnique.mockResolvedValue({ listId: 1 });

      await service.addItem(7, 1, 9);

      expect(prismaMock.listItem.upsert).not.toHaveBeenCalled();
    });

    it('refuses a full list', async () => {
      prismaMock.listItem.count.mockResolvedValue(MAX_ITEMS_PER_LIST);

      await expect(service.addItem(7, 1, 9)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.listItem.upsert).not.toHaveBeenCalled();
    });
  });

  it('removing a title that was not there leaves the list untouched', async () => {
    prismaMock.list.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.listItem.deleteMany.mockResolvedValue({ count: 0 });

    await service.removeItem(7, 1, 9);

    expect(prismaMock.list.update).not.toHaveBeenCalled();
  });
});

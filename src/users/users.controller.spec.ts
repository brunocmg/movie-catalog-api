import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const service = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  uploadAvatarImage: jest.fn(),
};

const user: AuthenticatedUser = { id: 1, email: 'a@a.com', role: Role.USER };

describe('UsersController', () => {
  const controller = new UsersController(service as unknown as UsersService);

  beforeEach(() => jest.resetAllMocks());

  it('delegates every route to the service with the current user', async () => {
    const pagination = { limit: 5, offset: 0 };
    const file = {
      originalname: 'a.png',
      mimetype: 'image/png',
      buffer: Buffer.from(''),
    };

    await controller.findAll(pagination);
    await controller.findOneUser(2, user);
    await controller.createUser({
      name: 'A',
      email: 'a@a.com',
      password: '123456',
    });
    await controller.updateUser(1, { name: 'B' }, user);
    await controller.deleteUser(1, user);
    await controller.uploadAvatar(user, file);

    expect(service.findAll).toHaveBeenCalledWith(pagination);
    expect(service.findOne).toHaveBeenCalledWith(2, user);
    expect(service.create).toHaveBeenCalledWith({
      name: 'A',
      email: 'a@a.com',
      password: '123456',
    });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'B' }, user);
    expect(service.delete).toHaveBeenCalledWith(1, user);
    expect(service.uploadAvatarImage).toHaveBeenCalledWith(user, file);
  });
});

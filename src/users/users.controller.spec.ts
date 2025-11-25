import { UsersController } from "./users.controller"

describe('Users Controller', () => {
  let controller: UsersController

  const usersServiceMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }

  beforeEach(() => {
    controller = new UsersController(usersServiceMock as any)
  })

  it('should create a new user', async () => {
    const userId = 1

    await controller.findOneUser(userId)

    expect(usersServiceMock.findOne).toHaveBeenCalledWith(userId)
  })
})
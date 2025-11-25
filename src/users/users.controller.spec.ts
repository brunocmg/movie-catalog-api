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
})
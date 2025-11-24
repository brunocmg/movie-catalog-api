import { HashingServiceProtocol } from "src/auth/hash/hashing.service"
import { UsersService } from "./users.service"
import { Test, TestingModule } from "@nestjs/testing"
import { PrismaService } from "src/prisma/prisma.service"
import { CreateUserDto } from "./dto/create-user.dto"

describe('UsersService', () => {
  let userService: UsersService
  let prismaService: PrismaService
  let hashingService: HashingServiceProtocol

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn().mockResolvedValue({
                id: 1,
                name: 'Bruno',
                email: 'bruno@teste.com'
              }),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn()
            }
          }
        },
        {
          provide: HashingServiceProtocol,
          useValue: {
            hash: jest.fn()
          }
        }
      ]
    }).compile()

    userService = module.get<UsersService>(UsersService)
    prismaService = module.get<PrismaService>(PrismaService)
    hashingService = module.get<HashingServiceProtocol>(HashingServiceProtocol)
  })

  describe ('Create User', () => {
    it ('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'bruno@teste.com',
        name: 'Bruno',
        password: '123123'
      }

      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXAMPLE')

      const result = await userService.create(createUserDto)

      expect(hashingService.hash).toHaveBeenCalled()
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: 'HASH_MOCK_EXAMPLE'
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })

      expect(result).toEqual({
        id: 1,
        name: createUserDto.name,
        email: createUserDto.email
      })
    })
  })
})
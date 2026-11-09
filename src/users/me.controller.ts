import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseUserDto } from './dto/response-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('me')
@Controller('me')
@Auth()
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get the own account' })
  @ApiOkResponse({ type: ResponseUserDto })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id, user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the own name and/or password' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(user.id, updateUserDto, user);
  }
}

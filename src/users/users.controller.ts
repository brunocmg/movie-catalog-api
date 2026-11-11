import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsersDto, ResponseUserDto } from './dto/response-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { StrictThrottle } from '../common/throttling/throttling';

type UploadedAvatarFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'List users (admin)' })
  @ApiOkResponse({ type: PaginatedUsersDto })
  @ApiBadRequestResponse({
    description: 'Invalid pagination params',
    type: ErrorResponseDto,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Find a user by id (own account, or any if admin)' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiForbiddenResponse({
    description: 'Not your account and not an admin',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  findOneUser(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.userService.findOne(id, user);
  }

  @Post()
  @StrictThrottle()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ type: ResponseUserDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'E-mail already registered',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many sign-ups from this IP',
    type: ErrorResponseDto,
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({ summary: 'Update the own user (name and/or password)' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Not your account',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  updateUser(
    @Param('id', ParseIdPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.userService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth()
  @ApiOperation({ summary: 'Delete a user (own account, or any if admin)' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiForbiddenResponse({
    description: 'Not your account and not an admin',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The last admin cannot be deleted',
    type: ErrorResponseDto,
  })
  deleteUser(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.userService.delete(id, user);
  }

  @Post('upload')
  @Auth()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_SIZE } }),
  )
  @ApiOperation({
    summary: 'Upload the own avatar (JPEG, PNG or WebP, max 3 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ResponseUserDto })
  @ApiUnprocessableEntityResponse({
    description: 'Missing file or invalid file type',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'File larger than 3 MB',
    type: ErrorResponseDto,
  })
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          // the service checks the file signature itself
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: MAX_AVATAR_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: UploadedAvatarFile,
  ) {
    return this.userService.uploadAvatarImage(user, file);
  }
}

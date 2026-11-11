import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth, OptionalAuth } from '../auth/decorators/auth.decorator';
import {
  CurrentUser,
  OptionalUser,
} from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ListsService } from './lists.service';
import {
  CreateListDto,
  ListDto,
  PaginatedListItemsDto,
  PaginatedListsDto,
  UpdateListDto,
} from './dto/list.dto';

@ApiTags('lists')
@Controller('me/lists')
@Auth()
export class MyListsController {
  constructor(private readonly lists: ListsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a list' })
  @ApiCreatedResponse({ type: ListDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Duplicate name or list limit reached',
    type: ErrorResponseDto,
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListDto) {
    return this.lists.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my lists, public and private' })
  @ApiOkResponse({ type: PaginatedListsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.lists.listMine(user.id, pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a list or change its visibility' })
  @ApiOkResponse({ type: ListDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'List not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Duplicate name',
    type: ErrorResponseDto,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateListDto,
  ) {
    return this.lists.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a list with its items' })
  @ApiNoContentResponse({ description: 'List deleted' })
  @ApiNotFoundResponse({
    description: 'List not found',
    type: ErrorResponseDto,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ) {
    return this.lists.remove(user.id, id);
  }

  @Put(':id/items/:titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a title to a list (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is in the list' })
  @ApiNotFoundResponse({
    description: 'List or title not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The list is full',
    type: ErrorResponseDto,
  })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.lists.addItem(user.id, id, titleId);
  }

  @Delete(':id/items/:titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a title from a list (idempotent)' })
  @ApiNoContentResponse({ description: 'Title is not in the list' })
  @ApiNotFoundResponse({
    description: 'List not found',
    type: ErrorResponseDto,
  })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
    @Param('titleId', ParseIdPipe) titleId: number,
  ) {
    return this.lists.removeItem(user.id, id, titleId);
  }
}

@ApiTags('lists')
@Controller('lists')
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse public lists (most recently changed first)',
  })
  @ApiOkResponse({ type: PaginatedListsDto })
  @ApiBadRequestResponse({
    description: 'Invalid pagination params',
    type: ErrorResponseDto,
  })
  listPublic(@Query() pagination: PaginationDto) {
    return this.lists.listPublic(pagination);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get a list',
    description:
      'Public lists are open to everyone; a private list is only visible to its owner (404 for anyone else).',
  })
  @ApiOkResponse({ type: ListDto })
  @ApiNotFoundResponse({
    description: 'List not found or private',
    type: ErrorResponseDto,
  })
  findOne(
    @Param('id', ParseIdPipe) id: number,
    @OptionalUser() viewer?: AuthenticatedUser,
  ) {
    return this.lists.findOne(id, viewer);
  }

  @Get(':id/items')
  @OptionalAuth()
  @ApiOperation({ summary: 'List the titles of a list, in the order added' })
  @ApiOkResponse({ type: PaginatedListItemsDto })
  @ApiNotFoundResponse({
    description: 'List not found or private',
    type: ErrorResponseDto,
  })
  listItems(
    @Param('id', ParseIdPipe) id: number,
    @Query() pagination: PaginationDto,
    @OptionalUser() viewer?: AuthenticatedUser,
  ) {
    return this.lists.listItems(id, pagination, viewer);
  }
}

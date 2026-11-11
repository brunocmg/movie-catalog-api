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
import { Role, TitleType } from '@prisma/client';
import { TitlesService } from '../titles/titles.service';
import { CreateTitleDto } from '../titles/dto/create-title.dto';
import { UpdateTitleDto } from '../titles/dto/update-title.dto';
import {
  PaginatedTitlesDto,
  ResponseTitleDto,
} from '../titles/dto/response-title.dto';
import { TitleSearchDto } from '../titles/dto/title-search.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly titles: TitlesService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new movie (admin)' })
  @ApiCreatedResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A movie with this name and year already exists',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateTitleDto) {
    return this.titles.create(TitleType.MOVIE, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search movies (paginated)' })
  @ApiOkResponse({ type: PaginatedTitlesDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  findAll(@Query() search: TitleSearchDto) {
    return this.titles.findAll(search, TitleType.MOVIE);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find one movie by id' })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Movie not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.titles.findOne(id, TitleType.MOVIE);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Update a movie (admin)' })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Movie not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A movie with this name and year already exists',
    type: ErrorResponseDto,
  })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateTitleDto) {
    return this.titles.update(id, TitleType.MOVIE, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a movie (admin)' })
  @ApiNoContentResponse({ description: 'Movie deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Movie not found',
    type: ErrorResponseDto,
  })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.titles.remove(id, TitleType.MOVIE);
  }
}

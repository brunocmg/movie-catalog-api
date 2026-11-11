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
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { ResponseSeasonDto } from './dto/response-season.dto';

@ApiTags('series')
@Controller('series')
export class SeriesController {
  constructor(
    private readonly titles: TitlesService,
    private readonly seasons: SeasonsService,
  ) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new series (admin)' })
  @ApiCreatedResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A series with this name and year already exists',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateTitleDto) {
    return this.titles.create(TitleType.SERIES, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search series (paginated)' })
  @ApiOkResponse({ type: PaginatedTitlesDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  findAll(@Query() search: TitleSearchDto) {
    return this.titles.findAll(search, TitleType.SERIES);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find one series by id' })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.titles.findOne(id, TitleType.SERIES);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Update a series (admin)' })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'A series with this name and year already exists',
    type: ErrorResponseDto,
  })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateTitleDto) {
    return this.titles.update(id, TitleType.SERIES, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a series with its seasons (admin)' })
  @ApiNoContentResponse({ description: 'Series deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.titles.remove(id, TitleType.SERIES);
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: 'List the seasons of a series' })
  @ApiOkResponse({ type: [ResponseSeasonDto] })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  listSeasons(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.listSeasons(id);
  }

  @Post(':id/seasons')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Add a season to a series (admin)' })
  @ApiCreatedResponse({ type: ResponseSeasonDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Season number already exists',
    type: ErrorResponseDto,
  })
  createSeason(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CreateSeasonDto,
  ) {
    return this.seasons.createSeason(id, dto);
  }
}

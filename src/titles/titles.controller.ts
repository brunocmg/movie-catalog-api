import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TitlesService } from './titles.service';
import { GenresService } from './genres.service';
import { ListTitlesQueryDto } from './dto/title-search.dto';
import { PaginatedTitlesDto, ResponseTitleDto } from './dto/response-title.dto';
import { ResponseGenreDto } from './dto/response-genre.dto';
import { CastMemberDto } from '../tmdb/dto/tmdb.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';

@ApiTags('titles')
@Controller()
export class TitlesController {
  constructor(
    private readonly titles: TitlesService,
    private readonly genres: GenresService,
  ) {}

  @Get('titles')
  @ApiOperation({ summary: 'List and search movies and series' })
  @ApiOkResponse({ type: PaginatedTitlesDto })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  findAll(@Query() { type, ...search }: ListTitlesQueryDto) {
    return this.titles.findAll(search, type);
  }

  @Get('titles/:id')
  @ApiOperation({ summary: 'Find a movie or series by id' })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.titles.findOne(id);
  }

  @Get('titles/:id/cast')
  @ApiOperation({ summary: 'List the cast of a title (imported from TMDB)' })
  @ApiOkResponse({ type: [CastMemberDto] })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  findCast(@Param('id', ParseIdPipe) id: number) {
    return this.titles.findCast(id);
  }

  @Get('genres')
  @ApiOperation({ summary: 'List genres' })
  @ApiOkResponse({ type: [ResponseGenreDto] })
  findGenres() {
    return this.genres.findAll();
  }
}

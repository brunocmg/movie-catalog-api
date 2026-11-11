import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ResponseTitleDto } from '../titles/dto/response-title.dto';
import { TmdbImportService } from './tmdb-import.service';
import {
  ImportTmdbDto,
  TmdbSearchQueryDto,
  TmdbSearchResultDto,
} from './dto/tmdb.dto';

@ApiTags('tmdb')
@Controller('tmdb')
@Auth(Role.ADMIN)
export class TmdbController {
  constructor(private readonly importer: TmdbImportService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search TMDB to find the id to import (admin)' })
  @ApiOkResponse({ type: [TmdbSearchResultDto] })
  @ApiBadRequestResponse({
    description: 'Invalid query params',
    type: ErrorResponseDto,
  })
  @ApiBadGatewayResponse({
    description: 'TMDB failed or is unreachable',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'TMDB token is not configured',
    type: ErrorResponseDto,
  })
  search(@Query() { q, type }: TmdbSearchQueryDto) {
    return this.importer.search(type, q);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import a movie or series from TMDB (admin)',
    description:
      'Creates the title with synopsis, poster, genres, runtime, director and cast. Series also get seasons and episodes. Importing again refreshes the metadata and keeps watch history.',
  })
  @ApiCreatedResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({
    description: 'Invalid body or TMDB title without a release year',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Not found on TMDB',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Another title with this name and year already exists',
    type: ErrorResponseDto,
  })
  @ApiBadGatewayResponse({
    description: 'TMDB failed or is unreachable',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'TMDB token is not configured',
    type: ErrorResponseDto,
  })
  import(@Body() { type, tmdbId }: ImportTmdbDto) {
    return this.importer.import(type, tmdbId);
  }
}

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
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { SeasonsService } from './seasons.service';
import { UpdateSeasonDto } from './dto/create-season.dto';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import {
  ResponseEpisodeDto,
  ResponseSeasonDto,
} from './dto/response-season.dto';

@ApiTags('seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Find one season by id' })
  @ApiOkResponse({ type: ResponseSeasonDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Season not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.findSeason(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Update a season (admin)' })
  @ApiOkResponse({ type: ResponseSeasonDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Season not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Season number already exists',
    type: ErrorResponseDto,
  })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateSeasonDto) {
    return this.seasons.updateSeason(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a season with its episodes (admin)' })
  @ApiNoContentResponse({ description: 'Season deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Season not found',
    type: ErrorResponseDto,
  })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.removeSeason(id);
  }

  @Get(':id/episodes')
  @ApiOperation({ summary: 'List the episodes of a season' })
  @ApiOkResponse({ type: [ResponseEpisodeDto] })
  @ApiNotFoundResponse({
    description: 'Season not found',
    type: ErrorResponseDto,
  })
  listEpisodes(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.listEpisodes(id);
  }

  @Post(':id/episodes')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Add an episode to a season (admin)' })
  @ApiCreatedResponse({ type: ResponseEpisodeDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Season not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Episode number already exists',
    type: ErrorResponseDto,
  })
  createEpisode(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CreateEpisodeDto,
  ) {
    return this.seasons.createEpisode(id, dto);
  }
}

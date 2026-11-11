import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { UpdateEpisodeDto } from './dto/create-episode.dto';
import { ResponseEpisodeDto } from './dto/response-season.dto';

@ApiTags('episodes')
@Controller('episodes')
export class EpisodesController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Find one episode by id' })
  @ApiOkResponse({ type: ResponseEpisodeDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Episode not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.findEpisode(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Update an episode (admin)' })
  @ApiOkResponse({ type: ResponseEpisodeDto })
  @ApiBadRequestResponse({
    description: 'Invalid id or request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Episode not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Episode number already exists',
    type: ErrorResponseDto,
  })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateEpisodeDto) {
    return this.seasons.updateEpisode(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an episode (admin)' })
  @ApiNoContentResponse({ description: 'Episode deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Episode not found',
    type: ErrorResponseDto,
  })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.seasons.removeEpisode(id);
  }
}

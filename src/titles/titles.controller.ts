import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { TitlesService } from './titles.service';
import { GenresService } from './genres.service';
import { ListTitlesQueryDto } from './dto/title-search.dto';
import { PaginatedTitlesDto, ResponseTitleDto } from './dto/response-title.dto';
import { ResponseGenreDto } from './dto/response-genre.dto';
import { CastMemberDto } from '../tmdb/dto/tmdb.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';

const MAX_POSTER_SIZE = 5 * 1024 * 1024;

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

  @Put('titles/:id/poster')
  @Auth(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_POSTER_SIZE } }),
  )
  @ApiOperation({
    summary:
      'Upload the poster of a title (admin, JPEG, PNG or WebP, max 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: ResponseTitleDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Title not found',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Missing file or invalid file type',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'File larger than 5 MB',
    type: ErrorResponseDto,
  })
  uploadPoster(
    @Param('id', ParseIdPipe) id: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          // the service checks the file signature itself
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: MAX_POSTER_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: { buffer: Buffer },
  ) {
    return this.titles.setPoster(id, file.buffer);
  }

  @Get('genres')
  @ApiOperation({ summary: 'List genres' })
  @ApiOkResponse({ type: [ResponseGenreDto] })
  findGenres() {
    return this.genres.findAll();
  }
}

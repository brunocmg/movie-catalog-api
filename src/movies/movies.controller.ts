import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ResponseMovieDto } from './dto/response-movie.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedMoviesDto } from './dto/paginated-movies.dto';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new movie' })
  @ApiCreatedResponse({
    description: 'Movie created successfully',
    type: ResponseMovieDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiInternalServerErrorResponse({ description: 'Movie registration failed' })
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(createMovieDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all movies' })
  @ApiOkResponse({
    description: 'Movies found successfully',
    type: PaginatedMoviesDto,
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to find movies' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.moviesService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find one movie by id' })
  @ApiOkResponse({
    description: 'Movie found successfully',
    type: ResponseMovieDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid movie id' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a movie' })
  @ApiOkResponse({
    description: 'Movie updated successfully',
    type: ResponseMovieDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid movie id or request body' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, updateMovieDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a movie' })
  @ApiOkResponse({
    description: 'Movie deleted successfully',
    type: ResponseMovieDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid movie id' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiInternalServerErrorResponse({ description: 'Failed to delete movie' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.remove(id);
  }
}

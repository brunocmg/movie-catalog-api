import { ApiProperty } from '@nestjs/swagger';

/** Shape of every error body, produced by AllExceptionsFilter. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({ example: 'Movie not found' })
  message: string;

  @ApiProperty({ example: '/movies/999' })
  path: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  timestamp: string;
}

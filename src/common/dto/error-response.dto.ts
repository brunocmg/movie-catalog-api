import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    example: '5f0c1c1e-8f0a-4a8e-9a43-3f1f0f8d2b6a',
    description: 'Same value as the X-Request-Id header and the server logs',
  })
  requestId: string;
}

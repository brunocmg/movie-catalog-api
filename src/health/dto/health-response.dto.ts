import { ApiProperty } from '@nestjs/swagger';

class HealthDatabaseDto {
  @ApiProperty({ example: 'up' })
  status: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-05-22T19:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 120.5 })
  uptime: number;

  @ApiProperty({ type: HealthDatabaseDto })
  database: HealthDatabaseDto;
}

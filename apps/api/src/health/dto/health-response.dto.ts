import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'cheer-api' })
  service!: string;

  @ApiPropertyOptional({ enum: ['up', 'down'], example: 'up' })
  database?: 'up' | 'down';

  @ApiProperty({ example: '2026-09-06T12:00:00.000Z' })
  timestamp!: string;
}

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';

import { HealthService } from './health.service';
import { HealthCheckResponse } from './interfaces/health-check.interface';

/** Swagger DTO for the backend service status. */
class BackendServiceStatusDto {
  @ApiProperty({ example: 'running', enum: ['running'] })
  status!: string;

  @ApiProperty({ example: 12345, description: 'Process uptime in seconds' })
  uptime!: number;
}

/** Swagger DTO for the PostgreSQL service status. */
class PostgresServiceStatusDto {
  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  status!: string;
}

/** Swagger DTO for the BBB service status. */
class BbbServiceStatusDto {
  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  status!: string;

  @ApiProperty({ example: 'https://bbb.example.com/bigbluebutton' })
  url!: string;
}

/** Swagger DTO for the frontend service status. */
class FrontendServiceStatusDto {
  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  status!: string;

  @ApiProperty({ example: 'http://frontend:80' })
  url!: string;
}

/** Swagger DTO for the aggregated services object. */
class HealthServicesDto {
  @ApiProperty({ type: BackendServiceStatusDto })
  backend!: BackendServiceStatusDto;

  @ApiProperty({ type: PostgresServiceStatusDto })
  postgres!: PostgresServiceStatusDto;

  @ApiProperty({ type: BbbServiceStatusDto })
  bbb!: BbbServiceStatusDto;

  @ApiProperty({ type: FrontendServiceStatusDto })
  frontend!: FrontendServiceStatusDto;
}

/** Swagger DTO for the complete health check response. */
class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: HealthServicesDto })
  services!: HealthServicesDto;
}

/**
 * Health check controller exposing the `GET /api/health` endpoint.
 *
 * Returns the status of all system services: backend, PostgreSQL,
 * BigBlueButton, and frontend. The endpoint is public (no auth required).
 */
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Returns a comprehensive health check of all system services.
   *
   * @returns Health check response with per-service status.
   */
  @Get()
  @ApiOperation({
    summary: 'System health check',
    description:
      'Returns the connectivity status of all system services: backend, PostgreSQL, BigBlueButton, and frontend. ' +
      'Overall status is "ok" when all services are connected, "degraded" when any service is unreachable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    type: HealthCheckResponseDto,
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}

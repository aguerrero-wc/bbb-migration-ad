import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';

import {
  BbbServiceStatus,
  FrontendServiceStatus,
  HealthCheckResponse,
  OverallHealthStatus,
  PostgresServiceStatus,
  ServiceConnectionStatus,
} from './interfaces/health-check.interface';

/** Timeout in milliseconds for external service HTTP checks. */
const HTTP_CHECK_TIMEOUT_MS = 3000;

/**
 * Service responsible for checking the health of all system components.
 *
 * Verifies connectivity to PostgreSQL, BigBlueButton, and the frontend
 * service. All checks run in parallel with a short timeout to avoid
 * blocking the endpoint.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly bbbServerUrl: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.bbbServerUrl = this.configService
      .get<string>('BBB_SERVER_URL', '')
      .replace(/\/+$/, '');
    this.frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://frontend:80')
      .replace(/\/+$/, '');
  }

  /**
   * Executes all health checks in parallel and returns the aggregated result.
   *
   * @returns Complete health check response with per-service status.
   */
  async check(): Promise<HealthCheckResponse> {
    const [postgresResult, bbbResult, frontendResult] =
      await Promise.allSettled([
        this.checkPostgres(),
        this.checkBbb(),
        this.checkFrontend(),
      ]);

    const postgres = this.extractSettledResult<PostgresServiceStatus>(
      postgresResult,
      { status: 'disconnected' },
    );
    const bbb = this.extractSettledResult<BbbServiceStatus>(bbbResult, {
      status: 'disconnected',
      url: this.bbbServerUrl,
    });
    const frontend = this.extractSettledResult<FrontendServiceStatus>(
      frontendResult,
      { status: 'disconnected', url: this.frontendUrl },
    );

    const allConnected =
      postgres.status === 'connected' &&
      bbb.status === 'connected' &&
      frontend.status === 'connected';

    const overallStatus: OverallHealthStatus = allConnected
      ? 'ok'
      : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        backend: {
          status: 'running',
          uptime: Math.floor(process.uptime()),
        },
        postgres,
        bbb,
        frontend,
      },
    };
  }

  /**
   * Checks PostgreSQL connectivity by executing a simple query.
   *
   * @returns PostgreSQL service status.
   */
  private async checkPostgres(): Promise<PostgresServiceStatus> {
    let status: ServiceConnectionStatus = 'disconnected';

    try {
      await this.dataSource.query('SELECT 1');
      status = 'connected';
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`PostgreSQL health check failed: ${message}`);
    }

    return { status };
  }

  /**
   * Checks BigBlueButton server connectivity via a simple HTTP GET.
   *
   * A successful response (any 2xx/3xx status) indicates the server is
   * reachable. No checksum or authentication is required for this check.
   *
   * @returns BBB service status with the configured URL.
   */
  private async checkBbb(): Promise<BbbServiceStatus> {
    let status: ServiceConnectionStatus = 'disconnected';

    if (!this.bbbServerUrl) {
      this.logger.warn(
        'BBB_SERVER_URL is not configured, skipping BBB health check',
      );
      return { status, url: this.bbbServerUrl };
    }

    try {
      await firstValueFrom(
        this.httpService.get(this.bbbServerUrl, {
          timeout: HTTP_CHECK_TIMEOUT_MS,
          validateStatus: (s: number) => s < 500,
        }),
      );
      status = 'connected';
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`BBB health check failed: ${message}`);
    }

    return { status, url: this.bbbServerUrl };
  }

  /**
   * Checks frontend service connectivity via a simple HTTP GET.
   *
   * A successful response (any 2xx/3xx status) indicates the frontend
   * container is reachable and serving content.
   *
   * @returns Frontend service status with the configured URL.
   */
  private async checkFrontend(): Promise<FrontendServiceStatus> {
    let status: ServiceConnectionStatus = 'disconnected';

    if (!this.frontendUrl) {
      this.logger.warn(
        'FRONTEND_URL is not configured, skipping frontend health check',
      );
      return { status, url: this.frontendUrl };
    }

    try {
      await firstValueFrom(
        this.httpService.get(this.frontendUrl, {
          timeout: HTTP_CHECK_TIMEOUT_MS,
          validateStatus: (s: number) => s < 500,
        }),
      );
      status = 'connected';
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Frontend health check failed: ${message}`);
    }

    return { status, url: this.frontendUrl };
  }

  /**
   * Safely extracts the value from a `PromiseSettledResult`, returning a
   * fallback when the promise was rejected.
   *
   * @param result - The settled promise result.
   * @param fallback - Default value to use when the promise was rejected.
   * @returns The fulfilled value or the fallback.
   */
  private extractSettledResult<T>(
    result: PromiseSettledResult<T>,
    fallback: T,
  ): T {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    this.logger.error(`Health check promise rejected: ${reason}`);
    return fallback;
  }
}

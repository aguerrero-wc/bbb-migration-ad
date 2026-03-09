/** Status of an individual service in the health check response. */
export type ServiceConnectionStatus = 'connected' | 'disconnected';

/** Backend service status (always running if the endpoint responds). */
export interface BackendServiceStatus {
  status: 'running';
  /** Process uptime in seconds. */
  uptime: number;
}

/** PostgreSQL service status. */
export interface PostgresServiceStatus {
  status: ServiceConnectionStatus;
}

/** BigBlueButton server status. */
export interface BbbServiceStatus {
  status: ServiceConnectionStatus;
  url: string;
}

/** Frontend service status. */
export interface FrontendServiceStatus {
  status: ServiceConnectionStatus;
  url: string;
}

/** Aggregated service statuses. */
export interface HealthServices {
  backend: BackendServiceStatus;
  postgres: PostgresServiceStatus;
  bbb: BbbServiceStatus;
  frontend: FrontendServiceStatus;
}

/** Overall system health status. */
export type OverallHealthStatus = 'ok' | 'degraded';

/** Complete health check response. */
export interface HealthCheckResponse {
  status: OverallHealthStatus;
  timestamp: string;
  services: HealthServices;
}

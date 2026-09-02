export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database?: 'up' | 'down';
  timestamp: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path?: string;
  timestamp?: string;
}

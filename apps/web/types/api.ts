export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path?: string;
  timestamp?: string;
}

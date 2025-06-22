export interface ServerInfo {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools?: {};
    resources?: {};
    prompts?: {};
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    config: boolean;
    nerdgraph?: boolean;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId: string;
}

export interface ToolMetadata {
  category: 'query' | 'discovery' | 'action' | 'analysis';
  readOnlyHint: boolean;
  destructiveHint: boolean;
  costIndicator: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  returnsNextCursor: boolean;
}
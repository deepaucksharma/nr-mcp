import { Config } from '../config';
import { HealthCheckResponse } from '../types';
import Logger from '../utils/logger';

export class HealthHandler {
  constructor(
    private config: Config,
    private _logger: Logger,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const version = process.env.npm_package_version || '2.0.0';
    
    let configValid = false;
    
    try {
      configValid = !!this.config.newrelic.apiKey && this.config.newrelic.apiKey.length > 0;
    } catch (error) {
      this._logger.error('Health check failed for config validation', error as Error);
    }
    
    const status = configValid ? 'healthy' : 'unhealthy';
    
    this._logger.debug('Health check completed', { status, configValid });
    
    return {
      status,
      timestamp,
      version,
      checks: {
        config: configValid,
      },
    };
  }
}
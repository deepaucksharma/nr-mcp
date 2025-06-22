/**
 * NerdGraph API types
 */

export interface NerdGraphConfig {
  apiKey: string;
  region: 'US' | 'EU';
  endpoint?: string;
  timeout?: number;
  retries?: number;
}

export interface NerdGraphResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

export interface NrqlQueryResult {
  results: any[];
  totalResult?: {
    count?: number;
  };
  metadata?: {
    eventTypes?: string[];
    rawResponse?: any;
    timeWindow?: {
      begin: number;
      end: number;
    };
  };
}
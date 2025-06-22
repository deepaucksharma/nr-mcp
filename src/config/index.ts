export interface Config {
  newrelic: {
    apiKey: string;
    accountId?: number;
    region: 'US' | 'EU';
    graphqlEndpoint: string;
  };
  server: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    environment: 'development' | 'production' | 'test';
  };
  cache: {
    ttl: {
      eventTypes: number;
      attributes: number;
      metrics: number;
      entities: number;
    };
  };
}

function getGraphQLEndpoint(region: 'US' | 'EU'): string {
  return region === 'EU' 
    ? 'https://api.eu.newrelic.com/graphql'
    : 'https://api.newrelic.com/graphql';
}

export function loadConfig(): Config {
  const region = (process.env.NEW_RELIC_REGION || 'US') as 'US' | 'EU';
  
  return {
    newrelic: {
      apiKey: process.env.NEW_RELIC_API_KEY || '',
      accountId: process.env.NEW_RELIC_ACCOUNT_ID 
        ? parseInt(process.env.NEW_RELIC_ACCOUNT_ID, 10) 
        : undefined,
      region,
      graphqlEndpoint: getGraphQLEndpoint(region),
    },
    server: {
      logLevel: (process.env.LOG_LEVEL || 'info') as Config['server']['logLevel'],
      environment: (process.env.NODE_ENV || 'development') as Config['server']['environment'],
    },
    cache: {
      ttl: {
        eventTypes: parseInt(process.env.CACHE_TTL_EVENT_TYPES || '3600', 10),
        attributes: parseInt(process.env.CACHE_TTL_ATTRIBUTES || '21600', 10),
        metrics: parseInt(process.env.CACHE_TTL_METRICS || '3600', 10),
        entities: parseInt(process.env.CACHE_TTL_ENTITIES || '900', 10),
      },
    },
  };
}

export function validateConfig(config: Config): void {
  if (!config.newrelic.apiKey) {
    throw new Error('NEW_RELIC_API_KEY environment variable is required');
  }
  
  if (config.newrelic.apiKey.length < 10) {
    throw new Error('NEW_RELIC_API_KEY appears to be invalid');
  }
}
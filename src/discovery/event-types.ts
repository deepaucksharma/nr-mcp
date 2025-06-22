/**
 * Event Type Discovery Implementation
 * 
 * Discovers available event types in a New Relic account using NRQL
 * SHOW EVENT TYPES queries via NerdGraph.
 */

import { NerdGraphClient } from '../utils/nerdgraph-client.js';
import { CacheManager } from '../cache/memory-cache.js';
import { createLogger } from '../utils/logger.js';
import {
  EventType,
  DiscoveryOptions,
  DiscoveryResult,
  DiscoveryError,
  DiscoveryErrorType,
  DiscoveryCacheKey
} from './types.js';

const logger = createLogger();

/**
 * Default options for event type discovery
 */
const DEFAULT_OPTIONS: Required<DiscoveryOptions> = {
  since: '1 hour ago',
  limit: 1000,
  useCache: true,
  cacheTtl: 3600 // 1 hour
};

/**
 * Event Type Discovery Engine
 * 
 * Discovers all available event types in a New Relic account
 * with intelligent caching and error handling.
 */
export class EventTypeDiscovery {
  constructor(
    private nerdGraphClient: NerdGraphClient,
    private cacheManager: CacheManager
  ) {}

  /**
   * Discover event types for a given account
   */
  async discoverEventTypes(
    accountId: number,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    logger.info('Starting event type discovery', {
      accountId,
      options: mergedOptions
    });

    // Check cache first
    if (mergedOptions.useCache) {
      const cached = await this.checkCache(accountId, mergedOptions);
      if (cached) {
        logger.info('Returning cached event types', {
          accountId,
          count: cached.eventTypes.length
        });
        return cached;
      }
    }

    try {
      // Execute discovery query
      const eventTypes = await this.executeDiscoveryQuery(
        accountId,
        mergedOptions.since,
        mergedOptions.limit
      );

      const queryTimeMs = Date.now() - startTime;

      // Build result
      const result: DiscoveryResult = {
        eventTypes,
        metadata: {
          accountId,
          timeRange: mergedOptions.since,
          fromCache: false,
          discoveredAt: new Date(),
          queryTimeMs
        }
      };

      // Cache the result
      if (mergedOptions.useCache && eventTypes.length > 0) {
        await this.cacheResult(accountId, mergedOptions, result);
      }

      logger.info('Event type discovery completed', {
        accountId,
        eventTypeCount: eventTypes.length,
        queryTimeMs
      });

      return result;
    } catch (error) {
      logger.error('Event type discovery failed', error as Error);
      throw this.handleError(error as Error);
    }
  }

  /**
   * Execute the NRQL discovery query via NerdGraph
   */
  private async executeDiscoveryQuery(
    accountId: number,
    since: string,
    limit: number
  ): Promise<EventType[]> {
    const nrqlQuery = `SHOW EVENT TYPES SINCE ${since} LIMIT ${limit}`;
    
    logger.debug('Executing NRQL discovery query', {
      accountId,
      query: nrqlQuery
    });

    try {
      const result = await this.nerdGraphClient.executeNrql(accountId, nrqlQuery);
      
      // Parse the results
      if (!result.results || !Array.isArray(result.results)) {
        logger.warn('No event types found', { accountId });
        return [];
      }

      return result.results.map(row => this.parseEventTypeRow(row));
    } catch (error) {
      // Handle empty account gracefully
      const errorMessage = (error as Error).message.toLowerCase();
      if (errorMessage.includes('no data') || errorMessage.includes('not found')) {
        logger.info('Account has no data', { accountId });
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse a single row from SHOW EVENT TYPES result
   */
  private parseEventTypeRow(row: any): EventType {
    // SHOW EVENT TYPES returns: eventType, count
    return {
      name: row.eventType || row.name || 'Unknown',
      sampleCount: parseInt(row.count || row.sampleCount || '0', 10),
      // Additional fields may be available in future NR versions
      firstSeen: row.firstSeen ? new Date(row.firstSeen) : undefined,
      lastSeen: row.lastSeen ? new Date(row.lastSeen) : undefined
    };
  }

  /**
   * Check cache for existing discovery results
   */
  private async checkCache(
    accountId: number,
    options: DiscoveryOptions
  ): Promise<DiscoveryResult | null> {
    const cacheKey = this.buildCacheKey(accountId, options);
    
    try {
      const cached = await this.cacheManager.get<DiscoveryResult>(cacheKey);
      if (cached) {
        // Update metadata to indicate cache hit
        cached.metadata.fromCache = true;
        return cached;
      }
    } catch (error) {
      logger.warn('Cache check failed', { error: (error as Error).message });
    }
    
    return null;
  }

  /**
   * Cache discovery results
   */
  private async cacheResult(
    accountId: number,
    options: DiscoveryOptions,
    result: DiscoveryResult
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(accountId, options);
    
    try {
      await this.cacheManager.set(
        cacheKey,
        result,
        options.cacheTtl || DEFAULT_OPTIONS.cacheTtl
      );
      logger.debug('Cached discovery results', {
        accountId,
        eventTypeCount: result.eventTypes.length
      });
    } catch (error) {
      logger.warn('Failed to cache results', { error: (error as Error).message });
      // Cache failure is not critical, continue
    }
  }

  /**
   * Build cache key for discovery results
   */
  private buildCacheKey(accountId: number, options: DiscoveryOptions): string {
    const key: DiscoveryCacheKey = {
      type: 'event_types',
      accountId,
      params: {
        since: options.since || DEFAULT_OPTIONS.since,
        limit: options.limit || DEFAULT_OPTIONS.limit
      }
    };
    
    return `discovery:${key.type}:${key.accountId}:${JSON.stringify(key.params)}`;
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: Error): DiscoveryError {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return new DiscoveryError(
        'Authentication failed. Please check your API key permissions.',
        DiscoveryErrorType.AUTH_ERROR,
        error
      );
    }
    
    if (message.includes('syntax') || message.includes('parse')) {
      return new DiscoveryError(
        'Query execution failed. This might be a bug in the discovery engine.',
        DiscoveryErrorType.QUERY_ERROR,
        error
      );
    }
    
    return new DiscoveryError(
      `Discovery failed: ${error.message}`,
      DiscoveryErrorType.UNKNOWN,
      error
    );
  }

  /**
   * Clear cached discovery results for an account
   */
  async clearCache(accountId: number): Promise<void> {
    const pattern = `discovery:event_types:${accountId}:*`;
    
    try {
      await this.cacheManager.clear(pattern);
      logger.info('Cleared discovery cache', { accountId, pattern });
    } catch (error) {
      logger.error('Failed to clear cache', error as Error);
      throw new DiscoveryError(
        'Failed to clear discovery cache',
        DiscoveryErrorType.CACHE_ERROR,
        error
      );
    }
  }
}
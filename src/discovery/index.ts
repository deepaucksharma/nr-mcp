/**
 * Platform Discovery Engine
 * 
 * Main entry point for all discovery operations.
 * Provides a unified interface for discovering schemas, attributes,
 * metrics, and other platform metadata at runtime.
 */

import { NerdGraphClient } from '../utils/nerdgraph-client.js';
import { CacheManager } from '../cache/memory-cache.js';
import { EventTypeDiscovery } from './event-types.js';
import { createLogger } from '../utils/logger.js';
import {
  EventType,
  DiscoveryOptions,
  DiscoveryResult
} from './types.js';

const logger = createLogger();

/**
 * Configuration for the discovery engine
 */
export interface DiscoveryEngineConfig {
  /** NerdGraph client instance */
  nerdGraphClient: NerdGraphClient;
  
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    defaultTtl?: number;
  };
}

/**
 * Platform Discovery Engine
 * 
 * Central orchestrator for all discovery operations.
 * Manages sub-engines for different discovery types.
 */
export class DiscoveryEngine {
  private cacheManager: CacheManager;
  private eventTypeDiscovery: EventTypeDiscovery;
  
  constructor(config: DiscoveryEngineConfig) {
    // Initialize cache manager
    this.cacheManager = new CacheManager(
      config.cache?.maxSize || 1000,
      60000 // 1 minute cleanup interval
    );
    
    // Initialize sub-engines
    this.eventTypeDiscovery = new EventTypeDiscovery(
      config.nerdGraphClient,
      this.cacheManager
    );
    
    logger.info('Discovery engine initialized', {
      cacheEnabled: config.cache?.enabled !== false,
      cacheMaxSize: config.cache?.maxSize || 1000
    });
  }
  
  /**
   * Discover available event types for an account
   */
  async discoverEventTypes(
    accountId: number,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult> {
    return this.eventTypeDiscovery.discoverEventTypes(accountId, options);
  }
  
  /**
   * Get all event types (convenience method)
   */
  async getEventTypes(
    accountId: number,
    options?: DiscoveryOptions
  ): Promise<EventType[]> {
    const result = await this.discoverEventTypes(accountId, options);
    return result.eventTypes;
  }
  
  /**
   * Clear discovery cache for an account
   */
  async clearCache(accountId?: number): Promise<void> {
    if (accountId) {
      await this.cacheManager.clear(`discovery:*:${accountId}:*`);
      logger.info('Cleared discovery cache for account', { accountId });
    } else {
      await this.cacheManager.clear('discovery:*');
      logger.info('Cleared all discovery cache');
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }
  
  /**
   * Shutdown the discovery engine
   */
  destroy() {
    this.cacheManager.destroy();
    logger.info('Discovery engine shutdown');
  }
}

// Export types for convenience
export * from './types.js';
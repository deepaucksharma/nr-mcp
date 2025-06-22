/**
 * Types for the Platform Discovery Engine
 * 
 * This module defines the core types for runtime schema discovery,
 * enabling zero-hardcoded schema architecture.
 */

/**
 * Represents a discovered event type in New Relic
 */
export interface EventType {
  /** Name of the event type (e.g., 'Transaction', 'PageView') */
  name: string;
  
  /** Number of sample events found in the time range */
  sampleCount: number;
  
  /** Optional: First time this event type was seen */
  firstSeen?: Date;
  
  /** Optional: Last time this event type was seen */
  lastSeen?: Date;
}

/**
 * Options for event type discovery
 */
export interface DiscoveryOptions {
  /** Time range for discovery (NRQL format, e.g., '1 hour ago') */
  since?: string;
  
  /** Maximum number of event types to return */
  limit?: number;
  
  /** Whether to use cached results */
  useCache?: boolean;
  
  /** Cache TTL in seconds (default: 3600) */
  cacheTtl?: number;
}

/**
 * Result of event type discovery including metadata
 */
export interface DiscoveryResult {
  /** Discovered event types */
  eventTypes: EventType[];
  
  /** Metadata about the discovery operation */
  metadata: {
    /** Account ID queried */
    accountId: number;
    
    /** Time range used */
    timeRange: string;
    
    /** Whether results were from cache */
    fromCache: boolean;
    
    /** Discovery timestamp */
    discoveredAt: Date;
    
    /** Query execution time in ms */
    queryTimeMs?: number;
  };
}

/**
 * Cache key structure for discovery operations
 */
export interface DiscoveryCacheKey {
  /** Type of discovery operation */
  type: 'event_types' | 'attributes' | 'metrics';
  
  /** Account ID */
  accountId: number;
  
  /** Additional parameters that affect the cache key */
  params?: Record<string, any>;
}

/**
 * Error types specific to discovery operations
 */
export enum DiscoveryErrorType {
  /** No data found (not an error, just empty results) */
  NO_DATA = 'NO_DATA',
  
  /** API authentication or permission error */
  AUTH_ERROR = 'AUTH_ERROR',
  
  /** Query execution error */
  QUERY_ERROR = 'QUERY_ERROR',
  
  /** Cache operation error */
  CACHE_ERROR = 'CACHE_ERROR',
  
  /** Unknown error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for discovery operations
 */
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public readonly type: DiscoveryErrorType,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}
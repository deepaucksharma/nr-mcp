/**
 * Simple in-memory cache implementation
 * 
 * Provides TTL-based caching with memory management
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger();

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private maxSize: number = 1000,
    private cleanupIntervalMs: number = 60000 // 1 minute
  ) {
    this.startCleanup();
  }
  
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    logger.debug('Cache hit', { key });
    return entry.value as T;
  }
  
  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Enforce size limit
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const entriesToRemove = Math.floor(this.maxSize * 0.1); // Remove 10%
      const keys = Array.from(this.cache.keys()).slice(0, entriesToRemove);
      keys.forEach(k => this.cache.delete(k));
      logger.warn('Cache size limit reached, removed oldest entries', {
        removed: entriesToRemove
      });
    }
    
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
    
    logger.debug('Cache set', { key, ttlSeconds });
  }
  
  /**
   * Clear cache entries matching a pattern
   */
  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      logger.info('Cache cleared completely');
      return;
    }
    
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let cleared = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    logger.info('Cache entries cleared', { pattern, cleared });
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    let expired = 0;
    const now = Date.now();
    
    for (const [, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }
  
  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug('Cleaned expired cache entries', { cleaned });
      }
    }, this.cleanupIntervalMs);
  }
  
  /**
   * Stop the cache manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
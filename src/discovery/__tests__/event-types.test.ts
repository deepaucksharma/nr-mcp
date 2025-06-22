/**
 * Tests for Event Type Discovery
 */

import { EventTypeDiscovery } from '../event-types.js';
import { NerdGraphClient } from '../../utils/nerdgraph-client.js';
import { CacheManager } from '../../cache/memory-cache.js';
import { DiscoveryErrorType } from '../types.js';

// Mock dependencies
jest.mock('../../utils/nerdgraph-client.js');
jest.mock('../../cache/memory-cache.js');

describe('EventTypeDiscovery', () => {
  let discovery: EventTypeDiscovery;
  let mockNerdGraphClient: jest.Mocked<NerdGraphClient>;
  let mockCacheManager: jest.Mocked<CacheManager>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockNerdGraphClient = new NerdGraphClient({
      apiKey: 'test-key',
      region: 'US'
    }) as jest.Mocked<NerdGraphClient>;
    
    mockCacheManager = new CacheManager() as jest.Mocked<CacheManager>;
    
    // Setup default mock behaviors
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
    mockCacheManager.clear.mockResolvedValue(undefined);
    
    // Create discovery instance
    discovery = new EventTypeDiscovery(mockNerdGraphClient, mockCacheManager);
  });
  
  describe('discoverEventTypes', () => {
    const accountId = 123456;
    
    it('should discover event types successfully', async () => {
      // Mock NRQL response
      mockNerdGraphClient.executeNrql.mockResolvedValue({
        results: [
          { eventType: 'Transaction', count: '1000000' },
          { eventType: 'PageView', count: '500000' },
          { eventType: 'JavaScriptError', count: '1000' }
        ],
        metadata: {
          eventTypes: ['Transaction', 'PageView', 'JavaScriptError']
        }
      });
      
      const result = await discovery.discoverEventTypes(accountId);
      
      expect(result.eventTypes).toHaveLength(3);
      expect(result.eventTypes[0]).toEqual({
        name: 'Transaction',
        sampleCount: 1000000,
        firstSeen: undefined,
        lastSeen: undefined
      });
      expect(result.metadata.accountId).toBe(accountId);
      expect(result.metadata.fromCache).toBe(false);
      expect(result.metadata.queryTimeMs).toBeGreaterThan(0);
    });
    
    it('should return cached results when available', async () => {
      const cachedResult = {
        eventTypes: [
          { name: 'Transaction', sampleCount: 999 }
        ],
        metadata: {
          accountId,
          timeRange: '1 hour ago',
          fromCache: false,
          discoveredAt: new Date()
        }
      };
      
      mockCacheManager.get.mockResolvedValue(cachedResult);
      
      const result = await discovery.discoverEventTypes(accountId);
      
      expect(mockNerdGraphClient.executeNrql).not.toHaveBeenCalled();
      expect(result.metadata.fromCache).toBe(true);
      expect(result.eventTypes).toEqual(cachedResult.eventTypes);
    });
    
    it('should handle empty account gracefully', async () => {
      mockNerdGraphClient.executeNrql.mockRejectedValue(
        new Error('No data found')
      );
      
      const result = await discovery.discoverEventTypes(accountId);
      
      expect(result.eventTypes).toEqual([]);
      expect(result.metadata.fromCache).toBe(false);
    });
    
    it('should respect cache option when disabled', async () => {
      mockCacheManager.get.mockResolvedValue({
        eventTypes: [{ name: 'Cached', sampleCount: 1 }],
        metadata: { accountId, timeRange: '1 hour ago', fromCache: false, discoveredAt: new Date() }
      });
      
      mockNerdGraphClient.executeNrql.mockResolvedValue({
        results: [{ eventType: 'Fresh', count: '2' }],
        metadata: { eventTypes: ['Fresh'] }
      });
      
      const result = await discovery.discoverEventTypes(accountId, {
        useCache: false
      });
      
      expect(result.eventTypes[0].name).toBe('Fresh');
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
    
    it('should handle authentication errors', async () => {
      mockNerdGraphClient.executeNrql.mockRejectedValue(
        new Error('Unauthorized: Invalid API key')
      );
      
      await expect(discovery.discoverEventTypes(accountId))
        .rejects.toThrow('Authentication failed');
      
      try {
        await discovery.discoverEventTypes(accountId);
      } catch (error: any) {
        expect(error.type).toBe(DiscoveryErrorType.AUTH_ERROR);
      }
    });
    
    it('should use custom time range', async () => {
      mockNerdGraphClient.executeNrql.mockResolvedValue({
        results: [],
        metadata: { eventTypes: [] }
      });
      
      await discovery.discoverEventTypes(accountId, {
        since: '24 hours ago'
      });
      
      expect(mockNerdGraphClient.executeNrql).toHaveBeenCalledWith(
        accountId,
        'SHOW EVENT TYPES SINCE 24 hours ago LIMIT 1000'
      );
    });
    
    it('should handle alternative result formats', async () => {
      // Some NR versions might return different field names
      mockNerdGraphClient.executeNrql.mockResolvedValue({
        results: [
          { name: 'Transaction', sampleCount: '1000' },
          { eventType: 'PageView', count: '500' }
        ],
        metadata: {}
      });
      
      const result = await discovery.discoverEventTypes(accountId);
      
      expect(result.eventTypes).toHaveLength(2);
      expect(result.eventTypes[0].name).toBe('Transaction');
      expect(result.eventTypes[1].name).toBe('PageView');
    });
    
    it('should cache results with correct TTL', async () => {
      mockNerdGraphClient.executeNrql.mockResolvedValue({
        results: [{ eventType: 'Test', count: '100' }],
        metadata: {}
      });
      
      await discovery.discoverEventTypes(accountId, {
        cacheTtl: 7200 // 2 hours
      });
      
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventTypes: expect.any(Array)
        }),
        7200
      );
    });
  });
  
  describe('clearCache', () => {
    it('should clear cache for specific account', async () => {
      await discovery.clearCache(123);
      
      expect(mockCacheManager.clear).toHaveBeenCalledWith(
        'discovery:event_types:123:*'
      );
    });
  });
});
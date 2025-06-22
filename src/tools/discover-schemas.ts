/**
 * Discovery Tool Handler
 * 
 * MCP tool for discovering available schemas in New Relic accounts
 */

import { DiscoveryEngine } from '../discovery/index.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const logger = createLogger();

/**
 * Input schema for the discover_schemas tool
 */
export const discoverSchemasInputSchema = z.object({
  account_id: z.number().describe('New Relic account ID'),
  include_attributes: z.boolean()
    .optional()
    .default(false)
    .describe('Include attribute profiling (not yet implemented)'),
  include_metrics: z.boolean()
    .optional()
    .default(true)
    .describe('Include metric discovery (not yet implemented)'),
  time_range: z.string()
    .optional()
    .default('1 hour ago')
    .describe('Time range for discovery (NRQL format)'),
  use_cache: z.boolean()
    .optional()
    .default(true)
    .describe('Use cached results if available')
});

export type DiscoverSchemasInput = z.infer<typeof discoverSchemasInputSchema>;

/**
 * Tool definition for discover_schemas
 */
export const discoverSchemasTool = {
  name: 'discover_schemas',
  description: 'Discover all available event types and their attributes in a New Relic account',
  inputSchema: {
    type: 'object',
    properties: {
      account_id: {
        type: 'number',
        description: 'New Relic account ID'
      },
      include_attributes: {
        type: 'boolean',
        description: 'Include attribute profiling (not yet implemented)',
        default: false
      },
      include_metrics: {
        type: 'boolean',
        description: 'Include metric discovery (not yet implemented)',
        default: true
      },
      time_range: {
        type: 'string',
        description: 'Time range for discovery (NRQL format)',
        default: '1 hour ago'
      },
      use_cache: {
        type: 'boolean',
        description: 'Use cached results if available',
        default: true
      }
    },
    required: ['account_id']
  },
  examples: [
    {
      description: 'Discover all event types in the last hour',
      input: {
        account_id: 123456,
        time_range: '1 hour ago'
      }
    },
    {
      description: 'Discover event types without cache',
      input: {
        account_id: 123456,
        use_cache: false
      }
    }
  ]
};

/**
 * Execute the discover_schemas tool
 */
export async function executeDiscoverSchemas(
  input: DiscoverSchemasInput,
  discoveryEngine: DiscoveryEngine
): Promise<any> {
  logger.info('Executing discover_schemas', { input });
  
  try {
    // Validate input
    const validatedInput = discoverSchemasInputSchema.parse(input);
    
    // Discover event types
    const discoveryResult = await discoveryEngine.discoverEventTypes(
      validatedInput.account_id,
      {
        since: validatedInput.time_range,
        useCache: validatedInput.use_cache
      }
    );
    
    // Format response
    const response = {
      event_types: discoveryResult.eventTypes.map(et => ({
        name: et.name,
        sample_count: et.sampleCount,
        attributes: [] // Placeholder for future attribute discovery
      })),
      metrics: [], // Placeholder for future metric discovery
      summary: {
        total_event_types: discoveryResult.eventTypes.length,
        total_metrics: 0, // Placeholder
        discovery_time_ms: discoveryResult.metadata.queryTimeMs || 0,
        from_cache: discoveryResult.metadata.fromCache,
        time_range: discoveryResult.metadata.timeRange
      }
    };
    
    // Add note about unimplemented features
    if (validatedInput.include_attributes) {
      (response.summary as any).note = 'Attribute profiling is not yet implemented';
    }
    
    logger.info('Discovery completed', {
      accountId: validatedInput.account_id,
      eventTypeCount: response.event_types.length,
      fromCache: response.summary.from_cache
    });
    
    return response;
    
  } catch (error) {
    logger.error('Discovery failed', error as Error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    // Re-throw with context
    throw error;
  }
}
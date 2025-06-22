#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, validateConfig } from './config';
import { createLogger } from './utils/logger';
import { HealthHandler } from './handlers/health';
import { ServerInfo } from './types';

const SERVER_INFO: ServerInfo = {
  name: 'mcp-server-newrelic',
  version: '2.0.0',
  description: 'MCP Server for New Relic - Platform-native schema-agnostic implementation',
  capabilities: {
    tools: true,
    resources: false,
    prompts: false,
  },
};

async function main() {
  const logger = createLogger();
  
  try {
    const config = loadConfig();
    
    logger.info('Starting MCP Server New Relic', {
      version: SERVER_INFO.version,
      environment: config.server.environment,
      region: config.newrelic.region,
    });
    
    logger.setLogLevel(config.server.logLevel);
    
    try {
      validateConfig(config);
    } catch (error) {
      logger.error('Configuration validation failed', error as Error);
      process.exit(1);
    }
    
    const server = new Server(
      {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    
    const healthHandler = new HealthHandler(config, logger.child());
    
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling list tools request');
      
      return {
        tools: [
          {
            name: 'health_check',
            description: 'Check the health status of the MCP server',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });
    
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.debug('Handling tool call request', { tool: request.params.name });
      
      try {
        switch (request.params.name) {
          case 'health_check': {
            const health = await healthHandler.checkHealth();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(health, null, 2),
                },
              ],
            };
          }
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        const err = error as Error;
        logger.error('Tool execution failed', err, { tool: request.params.name });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: {
                    code: 'TOOL_EXECUTION_ERROR',
                    message: err.message,
                  },
                  correlationId: logger.getCorrelationId(),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP Server New Relic started successfully');
    
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
import { NerdGraphConfig, NerdGraphResponse, NrqlQueryResult } from '../types/nerdgraph.js';

export class NerdGraphClient {
  private config: NerdGraphConfig;
  private endpoint: string;

  constructor(config: NerdGraphConfig) {
    this.config = config;
    this.endpoint = config.endpoint || this.getDefaultEndpoint(config.region);
  }

  private getDefaultEndpoint(region: 'US' | 'EU'): string {
    return region === 'EU' 
      ? 'https://api.eu.newrelic.com/graphql'
      : 'https://api.newrelic.com/graphql';
  }

  async executeQuery<T>(query: string, variables?: Record<string, any>): Promise<NerdGraphResponse<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': this.config.apiKey,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`NerdGraph request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<NerdGraphResponse<T>>;
  }

  async executeNrql(accountId: number, query: string): Promise<NrqlQueryResult> {
    const graphqlQuery = `
      query($accountId: Int!, $query: Nrql!) {
        actor {
          account(id: $accountId) {
            nrql(query: $query) {
              results
              totalResult {
                count
              }
              metadata {
                eventTypes
                rawResponse
              }
            }
          }
        }
      }
    `;

    const response = await this.executeQuery<{
      actor: {
        account: {
          nrql: NrqlQueryResult;
        };
      };
    }>(graphqlQuery, { accountId, query });

    if (response.errors) {
      throw new Error(`NRQL query failed: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return response.data.actor.account.nrql;
  }
}
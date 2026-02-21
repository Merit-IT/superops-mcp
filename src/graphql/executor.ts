import { graphQLClient } from './client.js';
import type { ListInfo, ListInfoInput } from '../models/Superops.js';

export interface ClientSiteIdentifierInput {
  id: string;
}

export interface InvoiceIdentifierInput {
  invoiceId: string;
}

export interface ClientIdentifierInput {
  accountId: string;
}

export interface ContractIdentifierInput {
  contractId : string;
}

export async function superopsListQuery<T>(
  query: string,
  variables: ListInfoInput | (Record<string, unknown> & { listInfo: ListInfoInput })
): Promise<{ data: Record<string, { listInfo: ListInfo } & Record<string, T[]>> }> {
  return superopsQuery(query, variables);
}

export async function superopsQuery<T>(
  query: string,
  variables: ClientSiteIdentifierInput | ListInfoInput | InvoiceIdentifierInput | ClientIdentifierInput | ContractIdentifierInput | Record<string, unknown> = {}
): Promise<{ data: Record<string, any> }> {
  try {
    const data = await graphQLClient.request(query, { input: variables });
    return { data };
  } catch (error) {
    throw new Error(`Error fetching data from GraphQL query`, {
      cause: error,
    });
  }
}

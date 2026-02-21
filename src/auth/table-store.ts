import crypto from 'node:crypto';
import { TableClient } from '@azure/data-tables';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { PendingAuthorization, StoredAuthCode, StoredRefreshToken, StoredToken } from './types.js';

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Azure Table Storage-backed auth store.
 * Persists OAuth state across container restarts / scale-to-zero.
 */
export class TableStorageAuthStore implements OAuthRegisteredClientsStore {
  private clients: TableClient;
  private pendingAuths: TableClient;
  private authCodes: TableClient;
  private accessTokens: TableClient;
  private codeChallenges: TableClient;
  private refreshTokens: TableClient;

  constructor(connectionString: string) {
    this.clients = TableClient.fromConnectionString(connectionString, 'clients');
    this.pendingAuths = TableClient.fromConnectionString(connectionString, 'pendingauths');
    this.authCodes = TableClient.fromConnectionString(connectionString, 'authcodes');
    this.accessTokens = TableClient.fromConnectionString(connectionString, 'accesstokens');
    this.codeChallenges = TableClient.fromConnectionString(connectionString, 'codechallenges');
    this.refreshTokens = TableClient.fromConnectionString(connectionString, 'refreshtokens');
  }

  /** Create all tables if they don't exist. Call once at startup. */
  async init(): Promise<void> {
    await Promise.all([
      this.clients.createTable(),
      this.pendingAuths.createTable(),
      this.authCodes.createTable(),
      this.accessTokens.createTable(),
      this.codeChallenges.createTable(),
      this.refreshTokens.createTable(),
    ].map(p => p.catch(() => { /* table already exists */ })));
  }

  // --- Client Registration (OAuthRegisteredClientsStore) ---

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    try {
      const entity = await this.clients.getEntity('client', clientId);
      return JSON.parse(entity.data as string);
    } catch (err: any) {
      if (err?.statusCode === 404) return undefined;
      console.error(`[TableStore] getClient failed for ${clientId}:`, err?.message || err);
      return undefined;
    }
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
  ): Promise<OAuthClientInformationFull> {
    const clientId = crypto.randomUUID();
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    await this.clients.upsertEntity({
      partitionKey: 'client',
      rowKey: clientId,
      data: JSON.stringify(registered),
    });
    console.log(`[TableStore] Registered client ${clientId}`);
    return registered;
  }

  // --- Pending Authorizations ---

  async storePendingAuth(state: string, auth: PendingAuthorization): Promise<void> {
    await this.pendingAuths.upsertEntity({
      partitionKey: 'pending',
      rowKey: state,
      data: JSON.stringify(auth),
      expiresAt: Date.now() + PENDING_AUTH_TTL_MS,
    });
  }

  async getPendingAuth(state: string): Promise<PendingAuthorization | undefined> {
    try {
      const entity = await this.pendingAuths.getEntity('pending', state);
      await this.pendingAuths.deleteEntity('pending', state);
      if ((entity.expiresAt as number) < Date.now()) return undefined;
      return JSON.parse(entity.data as string);
    } catch {
      return undefined;
    }
  }

  // --- Authorization Codes ---

  async storeAuthCode(code: string, data: Omit<StoredAuthCode, 'expiresAt'>): Promise<void> {
    await this.authCodes.upsertEntity({
      partitionKey: 'code',
      rowKey: code,
      data: JSON.stringify({ ...data, expiresAt: Date.now() + AUTH_CODE_TTL_MS }),
    });
  }

  async getAuthCode(code: string): Promise<StoredAuthCode | undefined> {
    try {
      const entity = await this.authCodes.getEntity('code', code);
      await this.authCodes.deleteEntity('code', code); // single use
      const stored: StoredAuthCode = JSON.parse(entity.data as string);
      if (stored.expiresAt < Date.now()) return undefined;
      return stored;
    } catch {
      return undefined;
    }
  }

  // --- Access Tokens ---

  async storeAccessToken(token: string, data: Omit<StoredToken, 'expiresAt'>): Promise<void> {
    await this.accessTokens.upsertEntity({
      partitionKey: 'token',
      rowKey: token,
      data: JSON.stringify({ ...data, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS }),
    });
  }

  async getAccessToken(token: string): Promise<StoredToken | undefined> {
    try {
      const entity = await this.accessTokens.getEntity('token', token);
      const stored: StoredToken = JSON.parse(entity.data as string);
      if (stored.expiresAt < Date.now()) {
        await this.accessTokens.deleteEntity('token', token);
        return undefined;
      }
      return stored;
    } catch {
      return undefined;
    }
  }

  // --- Refresh Tokens ---

  async storeRefreshToken(token: string, data: StoredRefreshToken): Promise<void> {
    await this.refreshTokens.upsertEntity({
      partitionKey: 'refresh',
      rowKey: token,
      data: JSON.stringify(data),
    });
  }

  async getRefreshToken(token: string): Promise<StoredRefreshToken | undefined> {
    try {
      const entity = await this.refreshTokens.getEntity('refresh', token);
      return JSON.parse(entity.data as string);
    } catch {
      return undefined;
    }
  }

  async deleteRefreshToken(token: string): Promise<void> {
    try {
      await this.refreshTokens.deleteEntity('refresh', token);
    } catch { /* ignore */ }
  }

  // --- Code Challenges (PKCE) ---

  async storeCodeChallenge(code: string, challenge: string): Promise<void> {
    await this.codeChallenges.upsertEntity({
      partitionKey: 'challenge',
      rowKey: code,
      data: challenge,
    });
  }

  async getCodeChallenge(code: string): Promise<string | undefined> {
    try {
      const entity = await this.codeChallenges.getEntity('challenge', code);
      return entity.data as string;
    } catch {
      return undefined;
    }
  }

  async deleteCodeChallenge(code: string): Promise<void> {
    try {
      await this.codeChallenges.deleteEntity('challenge', code);
    } catch { /* ignore */ }
  }
}

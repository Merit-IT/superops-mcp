import crypto from 'node:crypto';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { PendingAuthorization, StoredAuthCode, StoredRefreshToken, StoredToken } from './types.js';

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class InMemoryAuthStore implements OAuthRegisteredClientsStore {
  private pendingAuths = new Map<string, PendingAuthorization>();
  private authCodes = new Map<string, StoredAuthCode>();
  private accessTokens = new Map<string, StoredToken>();
  private refreshTokens = new Map<string, StoredRefreshToken>();
  private clients = new Map<string, OAuthClientInformationFull>();

  constructor() {
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  // --- Client Registration (OAuthRegisteredClientsStore) ---

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.clients.get(clientId);
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
    this.clients.set(clientId, registered);
    return registered;
  }

  // --- Pending Authorizations ---

  async storePendingAuth(state: string, auth: PendingAuthorization): Promise<void> {
    this.pendingAuths.set(state, auth);
  }

  async getPendingAuth(state: string): Promise<PendingAuthorization | undefined> {
    const auth = this.pendingAuths.get(state);
    if (auth) this.pendingAuths.delete(state);
    return auth;
  }

  // --- Authorization Codes ---

  async storeAuthCode(code: string, data: Omit<StoredAuthCode, 'expiresAt'>): Promise<void> {
    this.authCodes.set(code, { ...data, expiresAt: Date.now() + AUTH_CODE_TTL_MS });
  }

  async getAuthCode(code: string): Promise<StoredAuthCode | undefined> {
    const stored = this.authCodes.get(code);
    if (!stored) return undefined;
    this.authCodes.delete(code); // single use
    if (stored.expiresAt < Date.now()) return undefined;
    return stored;
  }

  // --- Access Tokens ---

  async storeAccessToken(token: string, data: Omit<StoredToken, 'expiresAt'>): Promise<void> {
    this.accessTokens.set(token, { ...data, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS });
  }

  async getAccessToken(token: string): Promise<StoredToken | undefined> {
    const stored = this.accessTokens.get(token);
    if (!stored) return undefined;
    if (stored.expiresAt < Date.now()) {
      this.accessTokens.delete(token);
      return undefined;
    }
    return stored;
  }

  // --- Refresh Tokens ---

  async storeRefreshToken(token: string, data: StoredRefreshToken): Promise<void> {
    this.refreshTokens.set(token, data);
  }

  async getRefreshToken(token: string): Promise<StoredRefreshToken | undefined> {
    return this.refreshTokens.get(token);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }

  // --- Cleanup ---

  private cleanup(): void {
    const now = Date.now();
    for (const [key, val] of this.authCodes) {
      if (val.expiresAt < now) this.authCodes.delete(key);
    }
    for (const [key, val] of this.accessTokens) {
      if (val.expiresAt < now) this.accessTokens.delete(key);
    }
  }
}

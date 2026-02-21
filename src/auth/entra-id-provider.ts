import crypto from 'node:crypto';
import { ConfidentialClientApplication } from '@azure/msal-node';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { TableStorageAuthStore } from './table-store.js';
import { InMemoryAuthStore } from './token-store.js';

// --- Configuration ---

const TENANT_ID = process.env.ENTRA_TENANT_ID;
const CLIENT_ID = process.env.ENTRA_CLIENT_ID;
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;
const BASE_URL = process.env.MCP_SERVER_BASE_URL || 'http://localhost:3000';
const STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing ENTRA_TENANT_ID, ENTRA_CLIENT_ID, or ENTRA_CLIENT_SECRET.');
  process.exit(1);
}

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    clientSecret: CLIENT_SECRET,
  },
});

const ENTRA_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read'];

// Use Table Storage in production, in-memory locally
export const authStore: TableStorageAuthStore | InMemoryAuthStore = STORAGE_CONNECTION_STRING
  ? new TableStorageAuthStore(STORAGE_CONNECTION_STRING)
  : new InMemoryAuthStore();

/** Initialize the store (creates tables if using Table Storage). */
export async function initAuthStore(): Promise<void> {
  if (authStore instanceof TableStorageAuthStore) {
    await authStore.init();
    console.log('Auth store: Azure Table Storage');
  } else {
    console.log('Auth store: in-memory (set AZURE_STORAGE_CONNECTION_STRING for persistence)');
  }
}

// --- Code Challenge Lookup (in-memory fallback only) ---
const codeChallengesMap = new Map<string, string>();

// --- AuthorizationParams type (matches SDK) ---

interface AuthorizationParams {
  state: string;
  scopes?: string[];
  codeChallenge: string;
  codeChallengeMethod?: string;
  redirectUri: string;
  resource?: URL;
}

// --- Provider ---

export const entraIdProvider: OAuthServerProvider = {
  get clientsStore(): OAuthRegisteredClientsStore {
    return authStore;
  },

  skipLocalPkceValidation: false,

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: any
  ): Promise<void> {
    const entraCodeVerifier = crypto.randomBytes(32).toString('base64url');
    const entraState = crypto.randomUUID();

    await authStore.storePendingAuth(entraState, {
      clientId: client.client_id,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod || 'S256',
      redirectUri: params.redirectUri,
      scopes: params.scopes || [],
      state: params.state,
      entraState,
      entraCodeVerifier,
    });

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: ENTRA_SCOPES,
      redirectUri: `${BASE_URL}/callback`,
      state: entraState,
      codeChallenge: crypto
        .createHash('sha256')
        .update(entraCodeVerifier)
        .digest('base64url'),
      codeChallengeMethod: 'S256',
    });

    res.redirect(authUrl);
  },

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    if (authStore instanceof TableStorageAuthStore) {
      return (await authStore.getCodeChallenge(authorizationCode)) || '';
    }
    return codeChallengesMap.get(authorizationCode) || '';
  },

  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
  ): Promise<OAuthTokens> {
    const stored = await authStore.getAuthCode(authorizationCode);
    if (!stored) {
      throw new Error('Invalid or expired authorization code');
    }

    if (authStore instanceof TableStorageAuthStore) {
      await authStore.deleteCodeChallenge(authorizationCode);
    } else {
      codeChallengesMap.delete(authorizationCode);
    }

    const accessToken = crypto.randomBytes(32).toString('base64url');
    const refreshToken = crypto.randomBytes(32).toString('base64url');

    await authStore.storeAccessToken(accessToken, {
      userId: stored.userId,
      email: stored.email,
      clientId: stored.clientId,
      scopes: ['claudeai'],
      entraRefreshToken: stored.entraRefreshToken,
    });

    await authStore.storeRefreshToken(refreshToken, {
      userId: stored.userId,
      email: stored.email,
      clientId: stored.clientId,
      scopes: ['claudeai'],
      entraRefreshToken: stored.entraRefreshToken,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
    };
  },

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
  ): Promise<OAuthTokens> {
    const stored = await authStore.getRefreshToken(refreshToken);
    if (!stored) {
      throw new Error('Invalid or expired refresh token');
    }

    // Rotate: delete the old refresh token so it can't be reused
    await authStore.deleteRefreshToken(refreshToken);

    const newAccessToken = crypto.randomBytes(32).toString('base64url');
    const newRefreshToken = crypto.randomBytes(32).toString('base64url');

    await authStore.storeAccessToken(newAccessToken, {
      userId: stored.userId,
      email: stored.email,
      clientId: stored.clientId,
      scopes: stored.scopes,
      entraRefreshToken: stored.entraRefreshToken,
    });

    await authStore.storeRefreshToken(newRefreshToken, {
      userId: stored.userId,
      email: stored.email,
      clientId: stored.clientId,
      scopes: stored.scopes,
      entraRefreshToken: stored.entraRefreshToken,
    });

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
    };
  },

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = await authStore.getAccessToken(token);
    if (!stored) {
      throw new Error('Invalid or expired access token');
    }

    return {
      token,
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Math.floor(stored.expiresAt / 1000),
    };
  },
};

/**
 * Handle the callback from Entra ID after user login.
 * Mount as GET /callback on the Express app.
 */
export async function handleEntraCallback(
  req: any,
  res: any
): Promise<void> {
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`Authentication failed: ${error_description || error}`);
    return;
  }

  if (!code || !state) {
    res.status(400).send('Missing code or state parameter');
    return;
  }

  const pending = await authStore.getPendingAuth(state as string);
  if (!pending) {
    res.status(400).send('Invalid or expired state parameter');
    return;
  }

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code: code as string,
      scopes: ENTRA_SCOPES,
      redirectUri: `${BASE_URL}/callback`,
      codeVerifier: pending.entraCodeVerifier,
    });

    const serverAuthCode = crypto.randomBytes(32).toString('base64url');

    // Store PKCE challenge
    if (authStore instanceof TableStorageAuthStore) {
      await authStore.storeCodeChallenge(serverAuthCode, pending.codeChallenge);
    } else {
      codeChallengesMap.set(serverAuthCode, pending.codeChallenge);
    }

    // MSAL stores the refresh token internally in its cache;
    // extract it so we can use it for silent token renewal later.
    const msalCache = msalClient.getTokenCache().serialize();
    let entraRefreshToken: string | undefined;
    try {
      const parsed = JSON.parse(msalCache);
      const refreshTokens = parsed.RefreshToken || {};
      const firstKey = Object.keys(refreshTokens)[0];
      if (firstKey) {
        entraRefreshToken = refreshTokens[firstKey].secret;
      }
    } catch { /* cache parse failed, proceed without refresh token */ }

    await authStore.storeAuthCode(serverAuthCode, {
      clientId: pending.clientId,
      codeChallenge: pending.codeChallenge,
      entraAccessToken: tokenResponse.accessToken,
      entraRefreshToken,
      redirectUri: pending.redirectUri,
      userId: tokenResponse.account?.localAccountId || 'unknown',
      email: tokenResponse.account?.username || '',
    });

    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set('code', serverAuthCode);
    redirectUrl.searchParams.set('state', pending.state);

    res.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error('Entra ID token exchange failed:', err);
    res.status(500).send('Failed to complete authentication');
  }
}

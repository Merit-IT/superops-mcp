export interface PendingAuthorization {
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  entraState: string;
  entraCodeVerifier: string;
}

export interface StoredAuthCode {
  clientId: string;
  codeChallenge: string;
  entraAccessToken: string;
  entraRefreshToken?: string;
  redirectUri: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export interface StoredToken {
  userId: string;
  email: string;
  clientId: string;
  scopes: string[];
  entraRefreshToken?: string;
  expiresAt: number;
}

export interface StoredRefreshToken {
  userId: string;
  email: string;
  clientId: string;
  scopes: string[];
  entraRefreshToken?: string;
}

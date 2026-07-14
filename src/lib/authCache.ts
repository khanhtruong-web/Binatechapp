// In-memory cache for the Google Workspace OAuth Access Token as mandated by the SDK guidelines

let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export function getCachedToken(): string | null {
  return cachedToken;
}

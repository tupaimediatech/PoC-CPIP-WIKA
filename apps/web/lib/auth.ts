const TOKEN_KEY = "cpip_token";
const USER_KEY = "cpip_user";
const TOKEN_EXPIRES_KEY = "cpip_token_expires_at";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setTokenExpiry(expiresAt: string | null | undefined): void {
  if (expiresAt) {
    localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
  } else {
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  }
}

export function getTokenExpiry(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_EXPIRES_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

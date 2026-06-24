import type { YnabBudget } from "@/lib/ynabApi";

export const YNAB_AUTHORIZE_URL = "https://app.ynab.com/oauth/authorize";

const TOKEN_STORAGE_KEY = "simulador:ynab:token";
const SELECTED_BUDGET_STORAGE_KEY = "simulador:ynab:selectedBudget";
const STATE_STORAGE_KEY = "simulador:ynab:oauthState";

export type YnabToken = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
};

export function getClientId(): string | null {
  const clientId = import.meta.env.VITE_YNAB_CLIENT_ID;
  return clientId && clientId.length > 0 ? clientId : null;
}

export function buildRedirectUri(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

function createState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string): string {
  const state = createState();
  try {
    sessionStorage.setItem(STATE_STORAGE_KEY, state);
  } catch {
    // sessionStorage unavailable; proceed without persisted state validation
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    state,
  });
  return `${YNAB_AUTHORIZE_URL}?${params.toString()}`;
}

function consumeStoredState(): string | null {
  try {
    const stored = sessionStorage.getItem(STATE_STORAGE_KEY);
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    return stored;
  } catch {
    return null;
  }
}

export function parseYnabFragment(hash: string): YnabToken | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  if (fragment.length === 0) return null;

  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const storedState = consumeStoredState();
  const returnedState = params.get("state");
  if (storedState !== null && storedState !== returnedState) {
    return null;
  }

  const tokenType = params.get("token_type") ?? "bearer";
  const expiresInRaw = params.get("expires_in");
  const expiresIn = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : NaN;
  const ttlMs = Number.isFinite(expiresIn) ? expiresIn * 1000 : 0;

  return {
    accessToken,
    tokenType,
    expiresAt: Date.now() + ttlMs,
  };
}

function isYnabToken(value: unknown): value is YnabToken {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.tokenType === "string" &&
    typeof candidate.expiresAt === "number"
  );
}

export function loadToken(): YnabToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isYnabToken(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistToken(token: YnabToken): boolean {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    return true;
  } catch {
    return false;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isTokenValid(token: YnabToken): boolean {
  return token.accessToken.length > 0 && token.expiresAt > Date.now();
}

function isYnabBudget(value: unknown): value is YnabBudget {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

export function loadSelectedBudget(): YnabBudget | null {
  try {
    const raw = localStorage.getItem(SELECTED_BUDGET_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isYnabBudget(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSelectedBudget(budget: YnabBudget): boolean {
  try {
    localStorage.setItem(SELECTED_BUDGET_STORAGE_KEY, JSON.stringify(budget));
    return true;
  } catch {
    return false;
  }
}

export function clearSelectedBudget(): void {
  try {
    localStorage.removeItem(SELECTED_BUDGET_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

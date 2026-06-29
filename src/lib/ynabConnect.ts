export const YNAB_AUTHORIZE_URL = "https://app.ynab.com/oauth/authorize";

const STATE_STORAGE_KEY = "simulador:ynab:oauthState";
const REQUEST_TIMEOUT_MS = 15000;

export class YnabConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YnabConnectError";
  }
}

export class YnabUnauthorizedError extends YnabConnectError {
  constructor(message = "Tu sesión expiró. Inicia sesión de nuevo.") {
    super(message);
    this.name = "YnabUnauthorizedError";
  }
}

export function getYnabClientId(): string | null {
  const clientId = import.meta.env.VITE_YNAB_CLIENT_ID;
  return clientId && clientId.length > 0 ? clientId : null;
}

export function getRedirectUri(): string {
  const configured = import.meta.env.VITE_YNAB_REDIRECT_URI;
  if (configured && configured.length > 0) return configured;
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
    response_type: "code",
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

export type CallbackParseResult = { ok: true; code: string } | { ok: false; error: string | null };

export function parseCallbackCode(search: string): CallbackParseResult {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const ynabError = params.get("error");
  if (ynabError) {
    return { ok: false, error: `YNAB rechazó la autorización (${ynabError}).` };
  }

  const code = params.get("code");
  if (!code) {
    return { ok: false, error: null };
  }

  const storedState = consumeStoredState();
  const returnedState = params.get("state");
  if (storedState !== null && storedState !== returnedState) {
    return { ok: false, error: "El estado de OAuth no coincide. Inténtalo de nuevo." };
  }

  return { ok: true, code };
}

type CallbackResponse = {
  connected: boolean;
};

function isCallbackResponse(value: unknown): value is CallbackResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return typeof candidate.connected === "boolean";
}

export async function postYnabCallback(
  apiBase: string,
  accessToken: string,
  code: string,
): Promise<CallbackResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/auth/ynab/callback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new YnabConnectError("No se pudo contactar al servidor. Revisa tu conexión.");
  }

  if (response.status === 401) {
    throw new YnabUnauthorizedError();
  }
  if (response.status === 409) {
    throw new YnabConnectError("YNAB no quedó conectado. Intenta el flujo de nuevo.");
  }
  if (response.status === 502) {
    throw new YnabConnectError("El intercambio de tokens con YNAB falló. Reintenta.");
  }
  if (!response.ok) {
    throw new YnabConnectError(`Error ${response.status} al conectar con YNAB.`);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isCallbackResponse(payload)) {
    throw new YnabConnectError("Respuesta inesperada del servidor.");
  }
  return payload;
}

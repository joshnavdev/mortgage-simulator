const SESSION_STORAGE_KEY = "simulador:cognito:session";

const COGNITO_CONTENT_TYPE = "application/x-amz-json-1.1";
const REQUEST_TIMEOUT_MS = 15000;

const TARGET_INITIATE_AUTH = "AWSCognitoIdentityProviderService.InitiateAuth";
const TARGET_RESPOND_CHALLENGE = "AWSCognitoIdentityProviderService.RespondToAuthChallenge";

export type CognitoSession = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type CognitoConfig = {
  clientId: string;
  region: string;
};

export class CognitoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CognitoAuthError";
  }
}

export function getCognitoConfig(): CognitoConfig | null {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const region = import.meta.env.VITE_COGNITO_REGION;
  if (!clientId || clientId.length === 0 || !region || region.length === 0) {
    return null;
  }
  return { clientId, region };
}

export function getApiBaseUrl(): string | null {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase || apiBase.length === 0) return null;
  return apiBase.replace(/\/+$/, "");
}

function cognitoEndpoint(region: string): string {
  return `https://cognito-idp.${region}.amazonaws.com/`;
}

type AuthenticationResult = {
  AccessToken: string;
  IdToken: string;
  ExpiresIn: number;
  RefreshToken?: string;
};

function isAuthenticationResult(value: unknown): value is AuthenticationResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.AccessToken === "string" &&
    typeof candidate.IdToken === "string" &&
    typeof candidate.ExpiresIn === "number"
  );
}

function extractAuthenticationResult(payload: unknown): AuthenticationResult | null {
  if (typeof payload !== "object" || payload === null) return null;
  const root: Record<string, unknown> = { ...payload };
  const result = root.AuthenticationResult;
  return isAuthenticationResult(result) ? result : null;
}

export type CognitoChallenge = {
  challengeName: "NEW_PASSWORD_REQUIRED";
  session: string;
  userId: string;
};

export type SignInResult =
  | { kind: "session"; session: CognitoSession }
  | { kind: "challenge"; challenge: CognitoChallenge };

function isNewPasswordChallenge(payload: unknown): payload is {
  ChallengeName: "NEW_PASSWORD_REQUIRED";
  Session: string;
  ChallengeParameters: { USER_ID_FOR_SRP: string };
} {
  if (typeof payload !== "object" || payload === null) return false;
  const root: Record<string, unknown> = { ...payload };
  if (root.ChallengeName !== "NEW_PASSWORD_REQUIRED") return false;
  if (typeof root.Session !== "string") return false;
  const params = root.ChallengeParameters;
  if (typeof params !== "object" || params === null) return false;
  const p: Record<string, unknown> = { ...params };
  return typeof p.USER_ID_FOR_SRP === "string";
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const root: Record<string, unknown> = { ...payload };
  const message = root.message ?? root.Message;
  return typeof message === "string" ? message : null;
}

async function callCognito(
  region: string,
  target: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(cognitoEndpoint(region), {
      method: "POST",
      headers: {
        "Content-Type": COGNITO_CONTENT_TYPE,
        "X-Amz-Target": target,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new CognitoAuthError("No se pudo conectar con Cognito. Revisa tu conexión.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = extractErrorMessage(payload);
    throw new CognitoAuthError(detail ?? "Credenciales inválidas o error de Cognito.");
  }

  return payload;
}

function toSession(result: AuthenticationResult, fallbackRefreshToken: string): CognitoSession {
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? fallbackRefreshToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000,
  };
}

export async function signIn(
  config: CognitoConfig,
  email: string,
  password: string,
): Promise<SignInResult> {
  const payload = await callCognito(config.region, TARGET_INITIATE_AUTH, {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.clientId,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });

  if (isNewPasswordChallenge(payload)) {
    return {
      kind: "challenge",
      challenge: {
        challengeName: "NEW_PASSWORD_REQUIRED",
        session: payload.Session,
        userId: payload.ChallengeParameters.USER_ID_FOR_SRP,
      },
    };
  }

  const result = extractAuthenticationResult(payload);
  if (!result) {
    throw new CognitoAuthError("Respuesta inesperada de Cognito al iniciar sesión.");
  }
  return { kind: "session", session: toSession(result, "") };
}

export async function respondToNewPasswordChallenge(
  config: CognitoConfig,
  challenge: CognitoChallenge,
  newPassword: string,
): Promise<CognitoSession> {
  const payload = await callCognito(config.region, TARGET_RESPOND_CHALLENGE, {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: config.clientId,
    ChallengeResponses: {
      USERNAME: challenge.userId,
      NEW_PASSWORD: newPassword,
    },
    Session: challenge.session,
  });
  const result = extractAuthenticationResult(payload);
  if (!result) {
    throw new CognitoAuthError("Respuesta inesperada de Cognito al cambiar la contraseña.");
  }
  return toSession(result, "");
}

export async function refresh(
  config: CognitoConfig,
  refreshToken: string,
): Promise<CognitoSession> {
  const payload = await callCognito(config.region, TARGET_INITIATE_AUTH, {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: config.clientId,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  const result = extractAuthenticationResult(payload);
  if (!result) {
    throw new CognitoAuthError("Respuesta inesperada de Cognito al refrescar la sesión.");
  }
  return toSession(result, refreshToken);
}

function isCognitoSession(value: unknown): value is CognitoSession {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.idToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.expiresAt === "number"
  );
}

export function loadSession(): CognitoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCognitoSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSession(session: CognitoSession): boolean {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isSessionValid(session: CognitoSession): boolean {
  return session.accessToken.length > 0 && session.expiresAt > Date.now();
}

import { z } from "zod";
import { getApiBaseUrl } from "@/lib/cognitoAuth";
import { YnabUnauthorizedError } from "@/lib/ynabApi";
import { rawTxnSchema, type RawTxn } from "@/lib/ynabTxnSchema";

const REQUEST_TIMEOUT_MS = 15000;
const GENERATE_TIMEOUT_MS = 60000;

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

function isAllowedContentType(value: string): value is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(value);
}

export function validateContentType(fileType: string): AllowedContentType {
  if (!isAllowedContentType(fileType)) {
    throw new Error(`Tipo de archivo no permitido: ${fileType}. Usa PNG, JPEG o WebP.`);
  }
  return fileType;
}

function getApiBase(): string {
  const apiBase = getApiBaseUrl();
  if (!apiBase) throw new Error("VITE_API_BASE_URL no está configurada.");
  return apiBase;
}

const uploadResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string(),
});

const generateResponseSchema = z.object({
  transactions: z.array(rawTxnSchema.extend({ confidence: z.string().nullish() })),
});

export async function requestUpload(
  accessToken: string,
  contentType: AllowedContentType,
): Promise<{ key: string; uploadUrl: string }> {
  const response = await fetch(`${getApiBase()}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contentType }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) throw new YnabUnauthorizedError();

  if (!response.ok) {
    throw new Error(`Error ${response.status} al solicitar la URL de subida.`);
  }

  const body: unknown = await response.json();
  const parsed = uploadResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Respuesta inesperada del servidor al solicitar subida.");
  }
  return parsed.data;
}

export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al subir la imagen a S3.`);
  }
}

export async function generateTransactions(accessToken: string, keys: string[]): Promise<RawTxn[]> {
  const response = await fetch(`${getApiBase()}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  });

  if (response.status === 401) throw new YnabUnauthorizedError();

  if (!response.ok) {
    throw new Error(`Error ${response.status} al generar transacciones desde la imagen.`);
  }

  const body: unknown = await response.json();
  const parsed = generateResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Respuesta inesperada del servidor al generar transacciones.");
  }

  return parsed.data.transactions;
}

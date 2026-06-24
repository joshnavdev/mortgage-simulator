import { z } from "zod";

export const txnDirectionSchema = z.enum(["outflow", "inflow"]);

export const rawTxnSchema = z.object({
  date: z.string().nullish(),
  payee: z.string().nullish(),
  amount: z.number().nullable(),
  direction: txnDirectionSchema.default("outflow"),
  category: z.string().nullish(),
  note: z.string().nullish(),
});

export const rawTxnArraySchema = z.array(rawTxnSchema);

export type RawTxn = z.infer<typeof rawTxnSchema>;

export type ParseTxnResult = { ok: true; txns: RawTxn[] } | { ok: false; error: string };

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(raíz)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseTxnInput(text: string): ParseTxnResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Pega un JSON con las transacciones." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "El texto no es un JSON válido." };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Se esperaba un array de transacciones." };
  }

  const result = rawTxnArraySchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: formatIssues(result.error) };
  }

  return { ok: true, txns: result.data };
}

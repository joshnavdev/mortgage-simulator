import { getApiBaseUrl } from "@/lib/cognitoAuth";

const REQUEST_TIMEOUT_MS = 15000;

function getYnabProxyBase(): string {
  const apiBase = getApiBaseUrl();
  if (!apiBase) throw new Error("VITE_API_BASE_URL no está configurada.");
  return `${apiBase}/ynab`;
}

const ALLOWED_ACCOUNT_TYPES: ReadonlySet<string> = new Set([
  "checking",
  "savings",
  "cash",
  "creditCard",
  "lineOfCredit",
]);

export type YnabBudget = {
  id: string;
  name: string;
};

export type YnabAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

export type YnabTransactionDraft = {
  account_id: string;
  date: string;
  payee_name: string | null;
  amount: number;
  category_id: string | null;
  memo: string | null;
  cleared: "uncleared";
  approved: boolean;
};

export type YnabCreateResult = {
  created: number;
};

export class YnabUnauthorizedError extends Error {
  constructor(message = "Tu sesión expiró. Inicia sesión de nuevo.") {
    super(message);
    this.name = "YnabUnauthorizedError";
  }
}

type YnabErrorBody = {
  error: { id: string; name: string; detail: string };
};

function isYnabErrorBody(value: unknown): value is YnabErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  const error = candidate.error;
  if (typeof error !== "object" || error === null) return false;
  const errorFields: Record<string, unknown> = { ...error };
  return typeof errorFields.detail === "string";
}

async function ynabRequest(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`${getYnabProxyBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) {
    throw new YnabUnauthorizedError();
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = isYnabErrorBody(body)
      ? body.error.detail
      : `Error ${response.status} al consultar YNAB.`;
    throw new Error(detail);
  }

  return response.json();
}

function getDataField(payload: unknown, field: string): unknown {
  if (typeof payload !== "object" || payload === null) return undefined;
  const root: Record<string, unknown> = { ...payload };
  const data = root.data;
  if (typeof data !== "object" || data === null) return undefined;
  const dataFields: Record<string, unknown> = { ...data };
  return dataFields[field];
}

function isBudget(value: unknown): value is YnabBudget {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

export async function fetchBudgets(accessToken: string): Promise<YnabBudget[]> {
  const payload = await ynabRequest(accessToken, "/plans");
  const budgets = getDataField(payload, "budgets");
  if (!Array.isArray(budgets)) return [];
  return budgets.filter(isBudget).map((budget) => ({ id: budget.id, name: budget.name }));
}

type RawAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  on_budget: boolean;
  closed: boolean;
  deleted: boolean;
};

function isRawAccount(value: unknown): value is RawAccount {
  if (typeof value !== "object" || value === null) return false;
  const c: Record<string, unknown> = { ...value };
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.type === "string" &&
    typeof c.balance === "number" &&
    typeof c.on_budget === "boolean" &&
    typeof c.closed === "boolean" &&
    typeof c.deleted === "boolean"
  );
}

export async function fetchAccounts(accessToken: string, budgetId: string): Promise<YnabAccount[]> {
  const payload = await ynabRequest(accessToken, `/plans/${budgetId}/accounts`);
  const accounts = getDataField(payload, "accounts");
  if (!Array.isArray(accounts)) return [];
  return accounts
    .filter(isRawAccount)
    .filter((a) => !a.deleted && !a.closed && a.on_budget && ALLOWED_ACCOUNT_TYPES.has(a.type))
    .map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

type RawCategory = {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
};

function isRawCategory(value: unknown): value is RawCategory {
  if (typeof value !== "object" || value === null) return false;
  const c: Record<string, unknown> = { ...value };
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.hidden === "boolean" &&
    typeof c.deleted === "boolean"
  );
}

function collectCategories(group: unknown): RawCategory[] {
  if (typeof group !== "object" || group === null) return [];
  const fields: Record<string, unknown> = { ...group };
  const categories = fields.categories;
  if (!Array.isArray(categories)) return [];
  return categories.filter(isRawCategory);
}

export async function fetchCategories(
  accessToken: string,
  budgetId: string,
): Promise<Map<string, string>> {
  const payload = await ynabRequest(accessToken, `/plans/${budgetId}/categories`);
  const groups = getDataField(payload, "category_groups");
  const map = new Map<string, string>();
  if (!Array.isArray(groups)) return map;
  groups
    .flatMap(collectCategories)
    .filter((c) => !c.hidden && !c.deleted)
    .forEach((c) => {
      map.set(c.name.trim().toLowerCase(), c.id);
    });
  return map;
}

export async function createTransactions(
  accessToken: string,
  budgetId: string,
  drafts: YnabTransactionDraft[],
): Promise<YnabCreateResult> {
  const payload = await ynabRequest(accessToken, `/plans/${budgetId}/transactions`, {
    method: "POST",
    body: JSON.stringify({ transactions: drafts }),
  });
  const created = getDataField(payload, "transaction_ids");
  return { created: Array.isArray(created) ? created.length : 0 };
}

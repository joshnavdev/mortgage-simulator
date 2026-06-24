import type { YnabTransactionDraft } from "@/lib/ynabApi";
import type { RawTxn } from "@/lib/ynabTxnSchema";

export type SkippedTxn = { txn: RawTxn; reason: string };

export type BuildResult = {
  drafts: YnabTransactionDraft[];
  skipped: SkippedTxn[];
};

function toMilliunits(amount: number, direction: RawTxn["direction"]): number {
  const cents = Math.round(amount * 1000);
  return direction === "outflow" ? -cents : cents;
}

export function buildPayload(
  txns: RawTxn[],
  accountId: string,
  categories: Map<string, string>,
): BuildResult {
  const drafts: YnabTransactionDraft[] = [];
  const skipped: SkippedTxn[] = [];

  txns.forEach((txn) => {
    if (txn.amount === null) return;

    const rawCategory = (txn.category ?? "").trim().toLowerCase();
    const categoryName = rawCategory === "split" ? "" : rawCategory;
    const categoryId = categoryName ? (categories.get(categoryName) ?? null) : null;

    if (categoryName && categoryId === null) {
      skipped.push({ txn, reason: `categoría '${txn.category}' no encontrada en YNAB` });
      return;
    }

    const date = (txn.date ?? "").trim();
    if (date.length === 0) {
      skipped.push({ txn, reason: "falta la fecha (YNAB la requiere)" });
      return;
    }

    drafts.push({
      account_id: accountId,
      date,
      payee_name: txn.payee ?? null,
      amount: toMilliunits(txn.amount, txn.direction),
      category_id: categoryId,
      memo: txn.note ?? null,
      cleared: "uncleared",
      approved: false,
    });
  });

  return { drafts, skipped };
}

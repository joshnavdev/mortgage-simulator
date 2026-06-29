import { useMemo } from "react";
import type { RawTxn } from "@/lib/ynabTxnSchema";

type TransactionPreviewTableProps = {
  transactions: RawTxn[];
};

function formatAmount(amount: number | null): string {
  if (amount === null) return "—";
  return amount.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionPreviewTable({ transactions }: TransactionPreviewTableProps) {
  const keyed = useMemo(
    () => transactions.map((txn) => ({ key: crypto.randomUUID(), txn })),
    [transactions],
  );

  if (keyed.length === 0) return null;

  return (
    <div className="ynab-txn__table-wrapper">
      <table className="ynab-txn__table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Beneficiario</th>
            <th>Monto</th>
            <th>Categoría</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {keyed.map(({ key, txn }) => (
            <tr key={key}>
              <td className="ynab-txn__table-date">{txn.date ?? "—"}</td>
              <td>{txn.payee ?? "—"}</td>
              <td
                className={
                  txn.direction === "outflow"
                    ? "ynab-txn__amount--outflow"
                    : "ynab-txn__amount--inflow"
                }
              >
                {txn.direction === "outflow" ? "-" : "+"}
                {formatAmount(txn.amount)}
              </td>
              <td className="ynab-txn__table-category">{txn.category ?? "—"}</td>
              <td className="ynab-txn__table-note">{txn.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

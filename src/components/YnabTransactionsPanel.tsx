import { useEffect, useMemo, useState } from "react";
import {
  createTransactions,
  fetchAccounts,
  fetchCategories,
  YnabUnauthorizedError,
  type YnabAccount,
} from "@/lib/ynabApi";
import { buildPayload, type BuildResult } from "@/lib/ynabBuildPayload";
import { parseTxnInput } from "@/lib/ynabTxnSchema";

type YnabTransactionsPanelProps = {
  accessToken: string;
  budgetId: string;
  onUnauthorized: () => void;
};

function formatSoles(milliunits: number): string {
  return (milliunits / 1000).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function YnabTransactionsPanel({
  accessToken,
  budgetId,
  onUnauthorized,
}: YnabTransactionsPanelProps) {
  const [accounts, setAccounts] = useState<YnabAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [jsonText, setJsonText] = useState("");
  const [simResult, setSimResult] = useState<BuildResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  function resetSimulation() {
    setSimResult(null);
    setSimError(null);
    setAddedCount(null);
    setAddError(null);
  }

  useEffect(() => {
    let active = true;
    setLoadingAccounts(true);
    setAccountsError(null);
    setAccounts([]);
    setSelectedAccountId("");
    resetSimulation();

    fetchAccounts(accessToken, budgetId)
      .then((result) => {
        if (!active) return;
        setAccounts(result);
        if (result.length > 0) setSelectedAccountId(result[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof YnabUnauthorizedError) {
          onUnauthorized();
        } else {
          setAccountsError(
            err instanceof Error ? err.message : "No se pudieron cargar las cuentas.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingAccounts(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, budgetId, onUnauthorized]);

  async function handleSimulate() {
    setSimulating(true);
    setSimError(null);
    setSimResult(null);
    setAddedCount(null);
    setAddError(null);

    const parsed = parseTxnInput(jsonText);
    if (!parsed.ok) {
      setSimError(parsed.error);
      setSimulating(false);
      return;
    }

    try {
      const categories = await fetchCategories(accessToken, budgetId);
      setSimResult(buildPayload(parsed.txns, selectedAccountId, categories));
    } catch (err) {
      if (err instanceof YnabUnauthorizedError) {
        onUnauthorized();
      } else {
        setSimError(err instanceof Error ? err.message : "No se pudo simular.");
      }
    } finally {
      setSimulating(false);
    }
  }

  async function handleAdd() {
    if (!simResult || simResult.drafts.length === 0) return;
    setAdding(true);
    setAddError(null);
    try {
      const result = await createTransactions(accessToken, budgetId, simResult.drafts);
      setAddedCount(result.created);
    } catch (err) {
      if (err instanceof YnabUnauthorizedError) {
        onUnauthorized();
      } else {
        setAddError(err instanceof Error ? err.message : "No se pudieron agregar.");
      }
    } finally {
      setAdding(false);
    }
  }

  const canAdd =
    simResult !== null && simResult.drafts.length > 0 && simError === null && addedCount === null;

  const keyedDrafts = useMemo(
    () => (simResult?.drafts ?? []).map((draft) => ({ key: crypto.randomUUID(), draft })),
    [simResult],
  );

  const keyedSkipped = useMemo(
    () => (simResult?.skipped ?? []).map((item) => ({ key: crypto.randomUUID(), item })),
    [simResult],
  );

  return (
    <div className="ynab-txn">
      <h2 className="ynab-txn__title">Transacciones</h2>

      <label className="ynab-txn__label" htmlFor="ynab-account">
        Cuenta destino
      </label>
      {loadingAccounts ? (
        <p className="ynab-txn__hint">Cargando cuentas…</p>
      ) : accountsError !== null ? (
        <p className="ynab__error">{accountsError}</p>
      ) : accounts.length === 0 ? (
        <p className="ynab-txn__hint">No se encontraron cuentas de efectivo o crédito.</p>
      ) : (
        <select
          id="ynab-account"
          className="ynab-txn__select"
          value={selectedAccountId}
          onChange={(e) => {
            setSelectedAccountId(e.target.value);
            resetSimulation();
          }}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.type}) · {formatSoles(account.balance)}
            </option>
          ))}
        </select>
      )}

      <label className="ynab-txn__label" htmlFor="ynab-json">
        JSON de transacciones
      </label>
      <textarea
        id="ynab-json"
        className="ynab-txn__textarea"
        value={jsonText}
        placeholder='[{"date":"2026-06-23","payee":"Tienda","amount":12.5,"direction":"outflow","category":"Comida","note":""}]'
        spellCheck={false}
        onChange={(e) => {
          setJsonText(e.target.value);
          resetSimulation();
        }}
      />

      <div className="ynab-txn__buttons">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleSimulate()}
          disabled={simulating || selectedAccountId === ""}
        >
          {simulating ? "Simulando…" : "Simular transacciones"}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleAdd()}
          disabled={!canAdd || adding}
        >
          {adding ? "Agregando…" : "Agregar transacciones"}
        </button>
      </div>

      {simError !== null && <pre className="ynab-txn__sim-error">{simError}</pre>}
      {addError !== null && <p className="ynab__error">{addError}</p>}

      {addedCount !== null && (
        <p className="ynab-txn__success">Se crearon {addedCount} transacción(es) en YNAB.</p>
      )}

      {simResult !== null && (
        <div className="ynab-txn__preview">
          <p className="ynab-txn__summary">
            {simResult.drafts.length} a crear · {simResult.skipped.length} omitida(s)
          </p>

          {simResult.drafts.length > 0 && (
            <ul className="ynab-txn__list">
              {keyedDrafts.map(({ key, draft }) => (
                <li key={key} className="ynab-txn__row">
                  <span className="ynab-txn__row-date">{draft.date}</span>
                  <span className="ynab-txn__row-payee">{draft.payee_name ?? "(sin payee)"}</span>
                  <span className="ynab-txn__row-amount">{formatSoles(draft.amount)}</span>
                  {draft.category_id === null && (
                    <span className="ynab-txn__row-uncat">(sin categoría)</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {simResult.skipped.length > 0 && (
            <ul className="ynab-txn__skipped">
              {keyedSkipped.map(({ key, item }) => (
                <li key={key}>
                  <span className="ynab-txn__row-payee">{item.txn.payee ?? "(sin payee)"}</span> —{" "}
                  {item.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

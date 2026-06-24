import { useCallback, useEffect, useState } from "react";
import "./YnabApp.css";
import {
  buildAuthorizeUrl,
  buildRedirectUri,
  clearSelectedBudget,
  clearToken,
  getClientId,
  isTokenValid,
  loadSelectedBudget,
  loadToken,
  parseYnabFragment,
  persistSelectedBudget,
  persistToken,
  type YnabToken,
} from "@/lib/ynabAuth";
import { fetchBudgets, YnabUnauthorizedError, type YnabBudget } from "@/lib/ynabApi";
import YnabTransactionsPanel from "@/components/YnabTransactionsPanel";

const YNAB_OFFICIAL_URL = "https://www.ynab.com";

export default function YnabApp() {
  const [token, setToken] = useState<YnabToken | null>(() => loadToken());
  const [budgets, setBudgets] = useState<YnabBudget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<YnabBudget | null>(() =>
    loadSelectedBudget(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.hash.includes("access_token")) return;
    const parsed = parseYnabFragment(window.location.hash);
    if (parsed) {
      persistToken(parsed);
      setToken(parsed);
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const clientId = getClientId();
  const connected = token !== null && isTokenValid(token);

  function handleConnect() {
    if (!clientId) return;
    window.location.assign(buildAuthorizeUrl(clientId, buildRedirectUri()));
  }

  const handleDisconnect = useCallback(() => {
    clearToken();
    clearSelectedBudget();
    setToken(null);
    setBudgets([]);
    setSelectedBudget(null);
    setError(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    handleDisconnect();
    setError("Tu sesión de YNAB expiró. Conéctate de nuevo.");
  }, [handleDisconnect]);

  async function handleFetchBudgets() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBudgets(token.accessToken);
      setBudgets(result);
    } catch (err) {
      if (err instanceof YnabUnauthorizedError) {
        handleUnauthorized();
      } else {
        setError(err instanceof Error ? err.message : "No se pudieron obtener los budgets.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSelectBudget(budget: YnabBudget) {
    setSelectedBudget(budget);
    persistSelectedBudget(budget);
  }

  return (
    <div className="ynab">
      <div className="header">
        <div className="header__icon">🔗</div>
        <h1 className="header__title">Integración YNAB</h1>
        <p className="header__subtitle">Conecta tu cuenta de YNAB para trabajar con tus budgets.</p>
      </div>

      <div className="card">
        {!clientId ? (
          <p className="ynab__notice">
            Falta configurar la variable de entorno <code>VITE_YNAB_CLIENT_ID</code> con el Client
            ID de tu aplicación OAuth de YNAB.
          </p>
        ) : !connected ? (
          <button type="button" className="btn-primary" onClick={handleConnect}>
            Conectar con YNAB
          </button>
        ) : (
          <div className="ynab__connected">
            <div className="ynab__status-row">
              <span className="ynab__status">Conectado a YNAB</span>
              <button type="button" className="ynab__disconnect" onClick={handleDisconnect}>
                Desconectar
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleFetchBudgets()}
              disabled={loading}
            >
              {loading ? "Obteniendo budgets…" : "Obtener budgets"}
            </button>

            {error !== null && <p className="ynab__error">{error}</p>}

            {budgets.length > 0 && (
              <ul className="ynab__budgets">
                {budgets.map((budget) => {
                  const active = selectedBudget?.id === budget.id;
                  return (
                    <li key={budget.id}>
                      <button
                        type="button"
                        className={"ynab__budget" + (active ? " is-active" : "")}
                        onClick={() => handleSelectBudget(budget)}
                      >
                        {budget.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedBudget !== null && (
              <p className="ynab__selected">
                Budget seleccionado: <strong>{selectedBudget.name}</strong>
              </p>
            )}

            {selectedBudget !== null && token !== null && (
              <YnabTransactionsPanel
                accessToken={token.accessToken}
                budgetId={selectedBudget.id}
                onUnauthorized={handleUnauthorized}
              />
            )}
          </div>
        )}
      </div>

      <p className="ynab__legal">
        No estamos afiliados, asociados ni conectados oficialmente con YNAB ni con ninguna de sus
        subsidiarias o afiliadas. El sitio web oficial de YNAB es{" "}
        <a href={YNAB_OFFICIAL_URL} target="_blank" rel="noreferrer">
          {YNAB_OFFICIAL_URL}
        </a>
        .
      </p>
    </div>
  );
}

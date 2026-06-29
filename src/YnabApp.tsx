import { useCallback, useEffect, useState } from "react";
import "./YnabApp.css";
import {
  clearSession,
  getApiBaseUrl,
  getCognitoConfig,
  isSessionValid,
  loadSession,
  persistSession,
  type CognitoSession,
} from "@/lib/cognitoAuth";
import {
  buildAuthorizeUrl,
  getRedirectUri,
  getYnabClientId,
  parseCallbackCode,
  postYnabCallback,
  YnabUnauthorizedError,
} from "@/lib/ynabConnect";
import {
  fetchBudgets,
  YnabUnauthorizedError as YnabApiUnauthorizedError,
  type YnabBudget,
} from "@/lib/ynabApi";
import LoginForm from "@/components/LoginForm";
import YnabTransactionsPanel from "@/components/YnabTransactionsPanel";

const YNAB_OFFICIAL_URL = "https://www.ynab.com";

export default function YnabApp() {
  const [session, setSession] = useState<CognitoSession | null>(() => loadSession());
  const [ynabConnected, setYnabConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<YnabBudget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [probing, setProbing] = useState(true);

  const cognitoConfig = getCognitoConfig();
  const apiBase = getApiBaseUrl();
  const ynabClientId = getYnabClientId();
  const authenticated = session !== null && isSessionValid(session);

  const handleSignOut = useCallback(() => {
    clearSession();
    setSession(null);
    setYnabConnected(false);
    setBudgets([]);
    setSelectedBudgetId("");
    setProbing(false);
    setError(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    handleSignOut();
    setError("Tu sesión expiró. Inicia sesión de nuevo.");
  }, [handleSignOut]);

  useEffect(() => {
    if (!window.location.search.includes("code=")) return;

    const parsed = parseCallbackCode(window.location.search);
    history.replaceState(null, "", window.location.pathname);

    if (!parsed.ok) {
      if (parsed.error !== null) setError(parsed.error);
      return;
    }

    const activeSession = loadSession();
    if (activeSession === null || !isSessionValid(activeSession) || apiBase === null) {
      setError("Inicia sesión antes de conectar YNAB.");
      return;
    }

    setConnecting(true);
    setError(null);
    postYnabCallback(apiBase, activeSession.accessToken, parsed.code)
      .then((result) => {
        setYnabConnected(result.connected);
      })
      .catch((err: unknown) => {
        if (err instanceof YnabUnauthorizedError) {
          handleSignOut();
          setError("Tu sesión expiró. Inicia sesión de nuevo.");
        } else {
          setError(err instanceof Error ? err.message : "No se pudo conectar con YNAB.");
        }
      })
      .finally(() => {
        setConnecting(false);
      });
  }, [apiBase, handleSignOut]);

  useEffect(() => {
    if (!session || !isSessionValid(session)) {
      setProbing(false);
      return;
    }

    let active = true;
    setLoadingBudgets(true);

    fetchBudgets(session.accessToken)
      .then((result) => {
        if (!active) return;
        setYnabConnected(true);
        setBudgets(result);
        if (result.length > 0) setSelectedBudgetId((prev) => prev || (result[0]?.id ?? ""));
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof YnabApiUnauthorizedError) {
          handleUnauthorized();
          return;
        }
        setYnabConnected(false);
      })
      .finally(() => {
        if (!active) return;
        setLoadingBudgets(false);
        setProbing(false);
      });

    return () => {
      active = false;
    };
  }, [session, ynabConnected, handleUnauthorized]);

  function handleAuthenticated(next: CognitoSession) {
    persistSession(next);
    setSession(next);
    setError(null);
  }

  function handleConnectYnab() {
    if (!ynabClientId) return;
    window.location.assign(buildAuthorizeUrl(ynabClientId, getRedirectUri()));
  }

  return (
    <div className="ynab">
      <div className="header">
        <div className="header__icon">🔗</div>
        <h1 className="header__title">Integración YNAB</h1>
        <p className="header__subtitle">Inicia sesión y conecta tu cuenta de YNAB.</p>
      </div>

      <div className="card">
        {cognitoConfig === null || apiBase === null ? (
          <p className="ynab__notice">
            Falta configurar las variables de entorno <code>VITE_COGNITO_CLIENT_ID</code>,{" "}
            <code>VITE_COGNITO_REGION</code> y <code>VITE_API_BASE_URL</code>.
          </p>
        ) : !authenticated ? (
          <>
            <LoginForm config={cognitoConfig} onAuthenticated={handleAuthenticated} />
            {error !== null && <p className="ynab__error">{error}</p>}
          </>
        ) : (
          <div className="ynab__connected">
            <div className="ynab__status-row">
              <span className="ynab__status">Sesión iniciada</span>
              <button type="button" className="ynab__disconnect" onClick={handleSignOut}>
                Cerrar sesión
              </button>
            </div>

            {!ynabClientId ? (
              <p className="ynab__notice">
                Falta configurar <code>VITE_YNAB_CLIENT_ID</code> para conectar con YNAB.
              </p>
            ) : ynabConnected ? (
              <>
                <p className="ynab-txn__success">YNAB conectado correctamente.</p>

                {loadingBudgets ? (
                  <p className="ynab-txn__hint">Cargando presupuestos…</p>
                ) : budgets.length === 0 ? (
                  <p className="ynab-txn__hint">No se encontraron presupuestos.</p>
                ) : (
                  <>
                    <label className="ynab-txn__label" htmlFor="ynab-budget">
                      Presupuesto
                    </label>
                    <select
                      id="ynab-budget"
                      className="ynab-txn__select"
                      value={selectedBudgetId}
                      onChange={(e) => setSelectedBudgetId(e.target.value)}
                    >
                      {budgets.map((budget) => (
                        <option key={budget.id} value={budget.id}>
                          {budget.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {selectedBudgetId.length > 0 && session !== null && (
                  <YnabTransactionsPanel
                    accessToken={session.accessToken}
                    budgetId={selectedBudgetId}
                    onUnauthorized={handleUnauthorized}
                  />
                )}
              </>
            ) : probing ? (
              <p className="ynab-txn__hint">Verificando conexión con YNAB…</p>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleConnectYnab}
                disabled={connecting}
              >
                {connecting ? "Conectando con YNAB…" : "Conectar con YNAB"}
              </button>
            )}

            {error !== null && <p className="ynab__error">{error}</p>}
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

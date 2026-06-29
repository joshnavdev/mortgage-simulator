import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTransactions,
  fetchAccounts,
  fetchCategories,
  YnabUnauthorizedError,
  type YnabAccount,
} from "@/lib/ynabApi";
import { buildPayload, type BuildResult } from "@/lib/ynabBuildPayload";
import { parseTxnInput, type RawTxn } from "@/lib/ynabTxnSchema";
import {
  generateTransactions,
  requestUpload,
  uploadToS3,
  validateContentType,
} from "@/lib/screenshotApi";
import TransactionPreviewTable from "@/components/TransactionPreviewTable";
import ImageUploadGallery, { type UploadedImage } from "@/components/ImageUploadGallery";

type InputMode = "ai" | "manual";

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
  const [inputMode, setInputMode] = useState<InputMode>("ai");
  const [parsedTxns, setParsedTxns] = useState<RawTxn[]>([]);
  const [validateError, setValidateError] = useState<string | null>(null);

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

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  function resetSimulation() {
    setSimResult(null);
    setSimError(null);
    setAddedCount(null);
    setAddError(null);
  }

  function resetAll() {
    setParsedTxns([]);
    setValidateError(null);
    resetSimulation();
  }

  function handleModeChange(mode: InputMode) {
    if (mode === inputMode) return;
    setInputMode(mode);
    resetAll();
  }

  function handleRemoveImage(id: string) {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((image) => image.id !== id);
    });
    setGenerateError(null);
    setParsedTxns([]);
    resetSimulation();
  }

  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  async function uploadSingle(file: File): Promise<UploadedImage> {
    const contentType = validateContentType(file.type);
    const { key, uploadUrl } = await requestUpload(accessToken, contentType);
    await uploadToS3(uploadUrl, file);
    return { id: crypto.randomUUID(), key, previewUrl: URL.createObjectURL(file) };
  }

  async function handlePickFiles(files: FileList) {
    setUploading(true);
    setUploadError(null);
    setGenerateError(null);
    setParsedTxns([]);
    resetSimulation();

    const results = await Promise.allSettled(Array.from(files).map(uploadSingle));

    const uploaded = results
      .filter(
        (result): result is PromiseFulfilledResult<UploadedImage> => result.status === "fulfilled",
      )
      .map((result) => result.value);
    if (uploaded.length > 0) setImages((prev) => [...prev, ...uploaded]);

    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      const unauthorized = failures.some(
        (failure) => failure.reason instanceof YnabUnauthorizedError,
      );
      if (unauthorized) {
        onUnauthorized();
      } else {
        setUploadError(`No se pudieron subir ${failures.length} imagen(es).`);
      }
    }

    setUploading(false);
  }

  async function handleGenerate() {
    if (images.length === 0) return;
    setGenerating(true);
    setGenerateError(null);
    setParsedTxns([]);
    resetSimulation();
    try {
      const txns = await generateTransactions(
        accessToken,
        images.map((image) => image.key),
      );
      setParsedTxns(txns);
    } catch (err) {
      if (err instanceof YnabUnauthorizedError) {
        onUnauthorized();
      } else {
        setGenerateError(err instanceof Error ? err.message : "No se pudo generar el JSON.");
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleValidateJson() {
    setValidateError(null);
    setParsedTxns([]);
    resetSimulation();
    const parsed = parseTxnInput(jsonText);
    if (!parsed.ok) {
      setValidateError(parsed.error);
      return;
    }
    setParsedTxns(parsed.txns);
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
    if (parsedTxns.length === 0) return;
    setSimulating(true);
    setSimError(null);
    setSimResult(null);
    setAddedCount(null);
    setAddError(null);

    try {
      const categories = await fetchCategories(accessToken, budgetId);
      setSimResult(buildPayload(parsedTxns, selectedAccountId, categories));
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

      <div className="ynab-txn__mode-switch">
        <button
          type="button"
          className={`ynab-txn__mode-btn ${inputMode === "ai" ? "is-active" : ""}`}
          onClick={() => handleModeChange("ai")}
        >
          IA (imagen)
        </button>
        <button
          type="button"
          className={`ynab-txn__mode-btn ${inputMode === "manual" ? "is-active" : ""}`}
          onClick={() => handleModeChange("manual")}
        >
          JSON manual
        </button>
      </div>

      {inputMode === "ai" && (
        <div className="ynab-txn__upload-section">
          <ImageUploadGallery
            images={images}
            uploading={uploading}
            onPickFiles={(files) => void handlePickFiles(files)}
            onRemove={handleRemoveImage}
          />

          {uploadError !== null && <p className="ynab__error">{uploadError}</p>}

          {images.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? "Generando…" : "Generar JSON"}
            </button>
          )}

          {generateError !== null && <p className="ynab__error">{generateError}</p>}
        </div>
      )}

      {inputMode === "manual" && (
        <div className="ynab-txn__manual-section">
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
              setParsedTxns([]);
              resetSimulation();
            }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleValidateJson}
            disabled={jsonText.trim().length === 0}
          >
            Validar JSON
          </button>
          {validateError !== null && <pre className="ynab-txn__sim-error">{validateError}</pre>}
        </div>
      )}

      {parsedTxns.length > 0 && <TransactionPreviewTable transactions={parsedTxns} />}

      {parsedTxns.length > 0 && (
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
      )}

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

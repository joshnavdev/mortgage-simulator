import { fmt, fmtInt } from "@/lib/calc";
import CronoTable from "@/components/CronoTable";

const TOGGLES = [
  { key: "simple", label: "Cronograma simple", color: "#6366f1" },
  { key: "doble", label: "Cronograma doble", color: "#10b981" },
];

export default function ResultsSection({
  result,
  nombre,
  setNombre,
  guardar,
  cronoMode,
  setCronoMode,
  visibleRows,
  setVisibleRows,
}) {
  const cards = [
    {
      label: "CUOTA SIMPLE",
      cuota: result.cuotaSimple,
      data: result.simple,
      accent: "#6366f1",
      accentBg: "rgba(99,102,241,0.12)",
    },
    {
      label: "CUOTA DOBLE",
      cuota: result.cuotaDoble,
      data: result.doble,
      accent: "#10b981",
      accentBg: "rgba(16,185,129,0.12)",
      dobleVal: result.cuotaDoble * 2,
    },
  ];

  const stats = [
    { label: "TEM ref.", val: (result.tem * 100).toFixed(4) + "%" },
    {
      label: "Tasa diaria",
      val: (result.tasaDiaria * 100).toFixed(6) + "%",
    },
    {
      label: "1er mes",
      val: result.simple.cronograma[0].dias + " días",
    },
  ];

  return (
    <div className="results">
      {/* Save */}
      <div className="save-row">
        <div className="input-box input-box--sm">
          <input
            type="text"
            placeholder="Nombre (ej: Bernales)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && guardar()}
            className="input input--sm"
          />
        </div>
        <button onClick={guardar} className="btn-save">
          + Comparar
        </button>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        {cards.map(({ label, cuota, data, accent, accentBg, dobleVal }, i) => (
          <div
            key={i}
            className="summary-card"
            style={{ "--accent": accent, "--accent-bg": accentBg }}
          >
            <div className="summary-card__label">{label}</div>
            <div className="summary-card__amount">S/ {fmt(cuota)}</div>
            {dobleVal && (
              <div className="summary-card__sub">
                Jul/Dic: S/ {fmt(dobleVal)}
              </div>
            )}
            <div className="summary-card__stats">
              <div className="summary-card__stat-row">
                <span>Total intereses</span>
                <span className="text-red">
                  S/ {fmtInt(data.totalIntereses)}
                </span>
              </div>
              <div className="summary-card__stat-row">
                <span>Total seguros</span>
                <span className="text-amber">
                  S/ {fmtInt(data.totalSeguros)}
                </span>
              </div>
              <div className="summary-card__total">
                <span>Total a pagar</span>
                <span>S/ {fmtInt(data.totalPagado)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Savings */}
      <div className="savings">
        <div>
          <div className="savings__label">Ahorro con cuota doble</div>
          <div className="savings__sub">Pagas menos intereses en total</div>
        </div>
        <div className="savings__value">
          S/ {fmtInt(result.simple.totalPagado - result.doble.totalPagado)}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(({ label, val }, i) => (
          <div key={i} className="stat">
            <div className="stat__label">{label}</div>
            <div className="stat__value">{val}</div>
          </div>
        ))}
      </div>

      {/* Cronograma toggle */}
      <div className="crono-toggle">
        {TOGGLES.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => {
              setCronoMode(cronoMode === key ? null : key);
              setVisibleRows(12);
            }}
            className={"crono-btn" + (cronoMode === key ? " is-active" : "")}
            style={{ "--accent": color }}
          >
            {cronoMode === key ? "▲" : "▼"} {label}
          </button>
        ))}
      </div>

      {cronoMode && (
        <CronoTable
          result={result}
          cronoMode={cronoMode}
          visibleRows={visibleRows}
          setVisibleRows={setVisibleRows}
        />
      )}
    </div>
  );
}

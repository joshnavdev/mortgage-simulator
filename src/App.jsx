import { useState, useCallback } from "react";
import "./App.css";
import { COLORS, runCalc } from "@/lib/calc";
import CompareSection from "@/components/CompareSection";
import ResultsSection from "@/components/ResultsSection";

export default function App() {
  const [monto, setMonto] = useState("");
  const [tea, setTea] = useState("");
  const [plazo, setPlazo] = useState("");
  const [seguroTasa, setSeguroTasa] = useState("0.0280");
  const [seguroInmueble, setSeguroInmueble] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [diaPago, setDiaPago] = useState("");
  const [precioInmueble, setPrecioInmueble] = useState("");
  const [metraje, setMetraje] = useState("");
  const [mantenimiento, setMantenimiento] = useState("");
  const [nombre, setNombre] = useState("");
  const [result, setResult] = useState(null);
  const [cronoMode, setCronoMode] = useState(null);
  const [visibleRows, setVisibleRows] = useState(12);
  const [saved, setSaved] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const calcular = useCallback(() => {
    const r = runCalc({
      monto,
      tea,
      plazo,
      seguroTasa,
      seguroInmueble,
      fechaInicio,
      diaPago,
    });
    if (r)
      setResult({
        ...r,
        params: {
          monto,
          tea,
          plazo,
          seguroTasa,
          seguroInmueble,
          fechaInicio,
          diaPago,
          precioInmueble,
          metraje,
          mantenimiento,
        },
      });
  }, [
    monto,
    tea,
    plazo,
    seguroTasa,
    seguroInmueble,
    fechaInicio,
    diaPago,
    precioInmueble,
    metraje,
    mantenimiento,
  ]);

  const guardar = () => {
    if (!result) return;
    setSaved([
      ...saved,
      {
        name: nombre.trim() || `Sim ${saved.length + 1}`,
        result,
        color: COLORS[saved.length % COLORS.length],
      },
    ]);
    setNombre("");
  };

  const eliminar = (i) => setSaved(saved.filter((_, j) => j !== i));

  const prestamoFields = [
    {
      label: "Monto del préstamo",
      prefix: "S/",
      value: monto,
      set: setMonto,
      ph: "432,000",
    },
    {
      label: "TEA (%)",
      suffix: "%",
      value: tea,
      set: setTea,
      ph: "8.20",
    },
    { label: "Plazo (meses)", value: plazo, set: setPlazo, ph: "300" },
  ];

  return (
    <div className="app">
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <div className="app__container">
        <div className="header">
          <div className="header__icon">🏠</div>
          <h1 className="header__title">Simulador Hipotecario</h1>
          <p className="header__subtitle">
            Cuota fija total · Simple y doble · Interés por días · Base 360
          </p>
        </div>

        {saved.length > 0 && (
          <div className="saved">
            {saved.map((s, i) => (
              <div
                key={i}
                className="saved__pill"
                style={{ "--pill-color": s.color }}
              >
                <div className="saved__dot" />
                <span className="saved__name">{s.name}</span>
                <span className="saved__remove" onClick={() => eliminar(i)}>
                  ✕
                </span>
              </div>
            ))}
            {saved.length >= 2 && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={
                  "saved__compare-btn" + (showCompare ? " is-active" : "")
                }
              >
                {showCompare ? "▲ Ocultar" : `⚡ Comparar (${saved.length})`}
              </button>
            )}
          </div>
        )}

        {showCompare && saved.length >= 2 && <CompareSection saved={saved} />}

        {/* Datos del inmueble */}
        <div className="card">
          <div className="card__header card__header--inmueble">
            Datos del inmueble
          </div>
          <div className="field-grid--3">
            <div>
              <label className="input-label">Precio inmueble</label>
              <div className="input-box">
                <span className="input-prefix input-prefix--sm input-prefix--inmueble">
                  S/
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="545,000"
                  value={precioInmueble}
                  onChange={(e) => setPrecioInmueble(e.target.value)}
                  className="input input--sm"
                />
              </div>
            </div>
            <div>
              <label className="input-label">Metraje</label>
              <div className="input-box">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="65.56"
                  value={metraje}
                  onChange={(e) => setMetraje(e.target.value)}
                  className="input input--sm"
                />
                <span className="input-suffix input-suffix--sm">m²</span>
              </div>
            </div>
            <div>
              <label className="input-label">Mantenimiento</label>
              <div className="input-box">
                <span className="input-prefix input-prefix--sm input-prefix--inmueble">
                  S/
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={mantenimiento}
                  onChange={(e) => setMantenimiento(e.target.value)}
                  className="input input--sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Datos del préstamo */}
        <div className="card">
          <div className="card__header card__header--prestamo">
            Datos del préstamo
          </div>
          {prestamoFields.map(({ label, prefix, suffix, value, set, ph }, i) => (
            <div key={i} className="field">
              <label className="input-label">{label}</label>
              <div className="input-box">
                {prefix && (
                  <span className="input-prefix input-prefix--prestamo">
                    {prefix}
                  </span>
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={ph}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                  className="input"
                />
                {suffix && <span className="input-suffix">{suffix}</span>}
              </div>
            </div>
          ))}
          <div className="field-grid--2">
            <div>
              <label className="input-label">Fecha de desembolso</label>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="23/04/2026"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                  className="input input--sm"
                />
              </div>
              <div className="input-hint">DD/MM/AAAA</div>
            </div>
            <div>
              <label className="input-label">Día de pago</label>
              <div className="input-box">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="25"
                  value={diaPago}
                  onChange={(e) => setDiaPago(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                  className="input input--sm"
                />
              </div>
              <div className="input-hint">Día fijo (1-28)</div>
            </div>
          </div>
        </div>

        {/* Seguros */}
        <div className="card">
          <div className="card__header card__header--seguros">
            Seguros (incluidos en la cuota fija)
          </div>
          <div className="field">
            <label className="input-label">
              Seguro desgravamen mensual (%)
            </label>
            <div className="input-box">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0280"
                value={seguroTasa}
                onChange={(e) => setSeguroTasa(e.target.value)}
                className="input"
              />
              <span className="input-suffix">%</span>
            </div>
          </div>
          <div>
            <label className="input-label">
              Seguro de inmueble (fijo mensual)
            </label>
            <div className="input-box">
              <span className="input-prefix input-prefix--seguros">S/</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="232.96"
                value={seguroInmueble}
                onChange={(e) => setSeguroInmueble(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <button onClick={calcular} className="btn-primary">
          Calcular
        </button>

        {result && (
          <ResultsSection
            result={result}
            nombre={nombre}
            setNombre={setNombre}
            guardar={guardar}
            cronoMode={cronoMode}
            setCronoMode={setCronoMode}
            visibleRows={visibleRows}
            setVisibleRows={setVisibleRows}
          />
        )}
      </div>
    </div>
  );
}

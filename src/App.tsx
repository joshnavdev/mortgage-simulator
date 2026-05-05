import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { useForm, type Validate } from "react-hook-form";
import "./App.css";
import { COLORS, fmtInt } from "@/lib/calc";
import { runCalc } from "@/lib/runCalc";
import Input from "@/components/Input";
import Slider from "@/components/Slider";
import CompareSection from "@/components/CompareSection";
import ResultsSection from "@/components/ResultsSection";
import type {
  CalcParams,
  CalcResult,
  CronoMode,
  FormValues,
  SavedSim,
} from "@/lib/types";

type CSSVars = CSSProperties & Record<`--${string}`, string>;

const positiveNumber: Validate<string, FormValues> = (v) =>
  (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Debe ser un número mayor a 0";

const today = new Date();
const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
const todayDay = String(Math.min(today.getDate(), 28));

const DEFAULT_VALUES: FormValues = {
  precioInmueble: "",
  cuotaInicialPct: "10",
  tea: "8.2",
  plazoAnios: "25",
  seguroTasa: "0.03",
  seguroInmueble: "0.021",
  mantenimiento: "",
  metraje: "",
  fechaInicio: todayStr,
  diaPago: todayDay,
};

export default function App() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const [result, setResult] = useState<CalcResult | null>(null);
  const [cronoMode, setCronoMode] = useState<CronoMode>(null);
  const [visibleRows, setVisibleRows] = useState<number>(12);
  const [saved, setSaved] = useState<SavedSim[]>([]);
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [nombre, setNombre] = useState<string>("");

  const watchedPrecio = watch("precioInmueble");
  const watchedCuotaInicialPct = watch("cuotaInicialPct");
  const inicialAmount = useMemo(() => {
    const precio = parseFloat(watchedPrecio);
    const pct = parseFloat(watchedCuotaInicialPct);
    if (!isFinite(precio) || precio <= 0 || !isFinite(pct)) return null;
    return (precio * pct) / 100;
  }, [watchedPrecio, watchedCuotaInicialPct]);

  const onSubmit = useCallback((data: FormValues) => {
    const precio = parseFloat(data.precioInmueble);
    const pct = parseFloat(data.cuotaInicialPct);
    const anios = parseFloat(data.plazoAnios);
    const monto = (precio * (1 - pct / 100)).toFixed(2);
    const plazo = String(Math.round(anios * 12));
    const params: CalcParams = { ...data, monto, plazo };
    const r = runCalc(params);
    if (r) setResult({ ...r, params });
  }, []);

  const guardar = () => {
    if (!result) return;
    setSaved([
      ...saved,
      {
        id: crypto.randomUUID(),
        name: nombre.trim() || `Sim ${saved.length + 1}`,
        result,
        color: COLORS[saved.length % COLORS.length] ?? "#6366f1",
      },
    ]);
    setNombre("");
  };

  const eliminar = (id: string): void => setSaved(saved.filter((s) => s.id !== id));

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
            {saved.map((s) => {
              const pillStyle: CSSVars = { "--pill-color": s.color };
              return (
                <div key={s.id} className="saved__pill" style={pillStyle}>
                  <div className="saved__dot" />
                  <span className="saved__name">{s.name}</span>
                  <span className="saved__remove" onClick={() => eliminar(s.id)}>
                    ✕
                  </span>
                </div>
              );
            })}
            {saved.length >= 2 && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={"saved__compare-btn" + (showCompare ? " is-active" : "")}
              >
                {showCompare ? "▲ Ocultar" : `⚡ Comparar (${saved.length})`}
              </button>
            )}
          </div>
        )}

        {showCompare && saved.length >= 2 && <CompareSection saved={saved} />}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Datos del préstamo */}
          <div className="card">
            <div className="card__header card__header--prestamo">Datos del préstamo</div>
            <div className="field-grid--2">
              <Input
                name="precioInmueble"
                label="Costo del inmueble"
                prefix="S/"
                variant="prestamo"
                placeholder="545,000"
                required
                rules={{ validate: positiveNumber }}
                register={register}
                error={errors.precioInmueble}
              />
              <Input
                name="tea"
                label="TEA (%)"
                suffix="%"
                variant="prestamo"
                placeholder="8.20"
                required
                rules={{ validate: positiveNumber }}
                register={register}
                error={errors.tea}
              />
            </div>
            <div className="field" style={{ marginTop: 20 }}>
              <Slider
                name="cuotaInicialPct"
                label="Cuota inicial (%)"
                min={10}
                max={90}
                step={5}
                suffix="%"
                required
                hint={inicialAmount !== null ? `S/ ${fmtInt(inicialAmount)}` : undefined}
                hintLabel="Tu cuota inicial sería de:"
                register={register}
                watch={watch}
                error={errors.cuotaInicialPct}
              />
            </div>
            <div className="field">
              <Slider
                name="plazoAnios"
                label="Plazo (años)"
                min={5}
                max={25}
                step={1}
                suffix="años"
                required
                register={register}
                watch={watch}
                error={errors.plazoAnios}
              />
            </div>
          </div>

          {/* Otros montos */}
          <div className="card">
            <div className="card__header card__header--seguros">Otros montos</div>
            <div className="field">
              <Input
                name="seguroTasa"
                label="Seguro desgravamen mensual (%)"
                suffix="%"
                variant="seguros"
                placeholder="0.03"
                required
                rules={{ validate: positiveNumber }}
                register={register}
                error={errors.seguroTasa}
              />
            </div>
            <div className="field">
              <Input
                name="seguroInmueble"
                label="Seguro de inmueble mensual (%)"
                suffix="%"
                variant="seguros"
                placeholder="0.021"
                register={register}
              />
            </div>
            <Input
              name="mantenimiento"
              label="Mantenimiento"
              prefix="S/"
              variant="seguros"
              placeholder="0"
              register={register}
            />
          </div>

          {/* Información extra (para comparación) */}
          <div className="card">
            <div className="card__header card__header--inmueble">
              Información extra (para comparación)
            </div>
            <div className="field-grid--3">
              <Input
                name="metraje"
                label="Metraje"
                suffix="m²"
                size="sm"
                placeholder="65.56"
                register={register}
              />
              <Input
                name="fechaInicio"
                label="Fecha de desembolso"
                size="sm"
                placeholder="23/04/2026"
                inputMode="text"
                hint="DD/MM/AAAA"
                register={register}
              />
              <Input
                name="diaPago"
                label="Día de pago"
                size="sm"
                placeholder="25"
                inputMode="numeric"
                hint="Día fijo (1-28)"
                register={register}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            Calcular
          </button>
        </form>

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

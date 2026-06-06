import { useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import "./SalaryApp.css";
import { COLORS } from "@/lib/calc";
import { loadSaved, persistSaved } from "@/lib/storage";
import { runSalaryCalc } from "@/lib/salaryCalc";
import SalaryResultsSection from "@/components/SalaryResultsSection";
import SalaryCompareSection from "@/components/SalaryCompareSection";
import type {
  SalaryFormValues,
  SalaryInputs,
  SalaryResult,
  SalarySavedSim,
} from "@/lib/salaryTypes";

type CSSVars = CSSProperties & Record<`--${string}`, string>;

const DEFAULT_VALUES: SalaryFormValues = {
  sueldo5ta: "11800",
  sueldo4ta: "0",
  gastoMensual: "7500",
  isUsd: true,
  ignorarGrati: false,
  ignorarCts: false,
  utilidadesFactor: "4.5",
  workingMonths4ta: "12",
};

function toInputs(data: SalaryFormValues): SalaryInputs {
  const num = (v: string): number => {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  };
  return {
    sueldo5ta: num(data.sueldo5ta),
    sueldo4ta: num(data.sueldo4ta),
    gastoMensual: num(data.gastoMensual),
    isUsd: data.isUsd,
    ignorarGrati: data.ignorarGrati,
    ignorarCts: data.ignorarCts,
    utilidadesFactor: num(data.utilidadesFactor),
    workingMonths4ta: num(data.workingMonths4ta) || 12,
  };
}

export default function SalaryApp() {
  const { register, handleSubmit } = useForm<SalaryFormValues>({
    mode: "onSubmit",
    defaultValues: DEFAULT_VALUES,
  });

  const [result, setResult] = useState<SalaryResult | null>(null);
  const [saved, setSaved] = useState<SalarySavedSim[]>(() => loadSaved<SalarySavedSim>("salary"));
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [nombre, setNombre] = useState<string>("");
  const [guardado, setGuardado] = useState<boolean>(false);

  const onSubmit = (data: SalaryFormValues): void => {
    setResult(runSalaryCalc(toInputs(data)));
  };

  const guardar = (): void => {
    if (!result) return;
    setSaved([
      ...saved,
      {
        id: crypto.randomUUID(),
        name: nombre.trim() || `Sueldo ${saved.length + 1}`,
        result,
        color: COLORS[saved.length % COLORS.length] ?? "#6366f1",
      },
    ]);
    setNombre("");
    setGuardado(false);
  };

  const eliminar = (id: string): void => {
    setSaved(saved.filter((s) => s.id !== id));
    setGuardado(false);
  };

  const guardarLocal = (): void => {
    if (persistSaved("salary", saved)) setGuardado(true);
  };

  return (
    <>
      <div className="header">
        <div className="header__icon">💵</div>
        <h1 className="header__title">Simulador de Sueldos</h1>
        <p className="header__subtitle">5ta y 4ta categoría · Gratificación · CTS · Utilidades</p>
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
          <button
            onClick={guardarLocal}
            className={"saved__save-btn" + (guardado ? " is-saved" : "")}
          >
            {guardado ? "✓ Guardado" : "💾 Guardar"}
          </button>
        </div>
      )}

      {showCompare && saved.length >= 2 && <SalaryCompareSection saved={saved} />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card">
          <div className="card__header card__header--prestamo">Ingresos</div>
          <div className="field-grid--2">
            <div>
              <label className="input-label">Sueldo 5ta (S/ mensual)</label>
              <div className="input-box">
                <span className="input-prefix input-prefix--prestamo">S/</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="11,800"
                  {...register("sueldo5ta")}
                />
              </div>
            </div>
            <div>
              <label className="input-label">Sueldo 4ta (mensual)</label>
              <div className="input-box">
                <span className="input-prefix input-prefix--prestamo">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0"
                  {...register("sueldo4ta")}
                />
              </div>
            </div>
          </div>
          <div className="field-grid--2" style={{ marginTop: 20 }}>
            <div>
              <label className="input-label">Factor utilidades (× sueldo 5ta)</label>
              <div className="input-box">
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="4.5"
                  {...register("utilidadesFactor")}
                />
              </div>
            </div>
            <div>
              <label className="input-label">Meses trabajados 4ta</label>
              <div className="input-box">
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="12"
                  {...register("workingMonths4ta")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header card__header--seguros">Gastos y opciones</div>
          <div className="field">
            <label className="input-label">Gasto mensual</label>
            <div className="input-box">
              <span className="input-prefix input-prefix--seguros">S/</span>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="7,500"
                {...register("gastoMensual")}
              />
            </div>
          </div>
          <div className="sal-toggles">
            <label className="sal-toggle">
              <input type="checkbox" {...register("isUsd")} />
              <span>Sueldo 4ta en USD</span>
            </label>
            <label className="sal-toggle">
              <input type="checkbox" {...register("ignorarGrati")} />
              <span>Ignorar gratificación</span>
            </label>
            <label className="sal-toggle">
              <input type="checkbox" {...register("ignorarCts")} />
              <span>Ignorar CTS</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Calcular
        </button>
      </form>

      {result && (
        <SalaryResultsSection
          result={result}
          nombre={nombre}
          setNombre={setNombre}
          guardar={guardar}
        />
      )}
    </>
  );
}

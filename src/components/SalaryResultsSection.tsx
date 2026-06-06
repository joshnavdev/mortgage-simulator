import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { fmt, fmtInt } from "@/lib/calc";
import { USD_PE } from "@/lib/salaryCalc";
import type { SalaryResult } from "@/lib/salaryTypes";

type CSSVars = CSSProperties & Record<`--${string}`, string>;

type SalaryResultsSectionProps = {
  result: SalaryResult;
  nombre: string;
  setNombre: Dispatch<SetStateAction<string>>;
  guardar: () => void;
};

type TwoColRow = { label: string; a: number; b: number; highlight?: boolean };

function TwoColTable({
  title,
  accent,
  headerA,
  headerB,
  rows,
}: {
  title: string;
  accent: string;
  headerA: string;
  headerB: string;
  rows: TwoColRow[];
}) {
  return (
    <div className="sal-table">
      <div className="sal-table__title" style={{ color: accent }}>
        {title}
      </div>
      <table className="sal-table__grid">
        <thead>
          <tr>
            <th className="sal-table__th sal-table__th--label" />
            <th className="sal-table__th">{headerA}</th>
            <th className="sal-table__th">{headerB}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={"sal-table__row" + (row.highlight ? " is-highlight" : "")}
            >
              <td className="sal-table__label">{row.label}</td>
              <td className="sal-table__cell">{fmt(row.a)}</td>
              <td className="sal-table__cell">{fmt(row.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SalaryResultsSection({
  result,
  nombre,
  setNombre,
  guardar,
}: SalaryResultsSectionProps) {
  const componentes: TwoColRow[] = [
    { label: "Sueldo", a: result.sueldoAnual, b: result.sueldoBrutoMensual },
    { label: "Gratificación", a: result.gratiAnual, b: result.gratiMensual },
    { label: "CTS", a: result.ctsAnual, b: result.ctsMensual },
    { label: "Utilidades", a: result.utilidadesAnual, b: result.utilidadesAnual / 12 },
    {
      label: "Total Anual (bruto)",
      a: result.totalAnualBruto,
      b: result.totalAnualBruto / 12,
      highlight: true,
    },
  ];

  const aportes: Array<{ label: string; value: number }> = [
    { label: "AFP", value: result.afpMensual },
    { label: "Impuesto mensual", value: result.impuestoMensual },
  ];

  const summaryStyle: CSSVars = {
    "--accent": "#10b981",
    "--accent-bg": "rgba(16,185,129,0.12)",
  };

  return (
    <div className="results">
      <div className="save-row">
        <div className="input-box input-box--sm">
          <input
            type="text"
            placeholder="Nombre (ej: Oferta A)"
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

      <div className="summary-card sal-summary" style={summaryStyle}>
        <div className="summary-card__label">NETO MENSUAL (sueldo + grati + cts)</div>
        <div className="summary-card__amount">S/ {fmt(result.netoFinalMensual)}</div>
        <div className="summary-card__sub">USD {fmt(result.netoFinalMensual / USD_PE)}</div>
      </div>

      <TwoColTable
        title="Componentes"
        accent="#6366f1"
        headerA="Anual"
        headerB="Mensual"
        rows={componentes}
      />

      <div className="sal-table">
        <div className="sal-table__title" style={{ color: "#fbbf24" }}>
          Aportes (mensual)
        </div>
        <table className="sal-table__grid">
          <tbody>
            {aportes.map((r) => (
              <tr key={r.label} className="sal-table__row">
                <td className="sal-table__label">{r.label}</td>
                <td className="sal-table__cell">{fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sal-table">
        <div className="sal-table__title" style={{ color: "#34d399" }}>
          Resumen Neto (mensual) · gasto: S/ {fmtInt(result.inputs.gastoMensual)}
        </div>
        <table className="sal-table__grid">
          <thead>
            <tr>
              <th className="sal-table__th sal-table__th--label" />
              <th className="sal-table__th">neto PEN</th>
              <th className="sal-table__th">neto USD</th>
              <th className="sal-table__th">ahorro PEN</th>
              <th className="sal-table__th">ahorro USD</th>
            </tr>
          </thead>
          <tbody>
            {result.stages.map((s) => (
              <tr key={s.label} className="sal-table__row">
                <td className="sal-table__label">{s.label}</td>
                <td className="sal-table__cell">{fmt(s.netoMensual)}</td>
                <td className="sal-table__cell">{fmt(s.netoMensual / USD_PE)}</td>
                <td className={"sal-table__cell" + (s.ahorroMensual < 0 ? " text-red" : "")}>
                  {fmt(s.ahorroMensual)}
                </td>
                <td className={"sal-table__cell" + (s.ahorroMensual < 0 ? " text-red" : "")}>
                  {fmt(s.ahorroMensual / USD_PE)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.utilidadesAnual > 0 && (
        <div className="sal-table">
          <div className="sal-table__title" style={{ color: "#c084fc" }}>
            Utilidades (pago único · abril)
          </div>
          <table className="sal-table__grid">
            <thead>
              <tr>
                <th className="sal-table__th sal-table__th--label" />
                <th className="sal-table__th">PEN</th>
                <th className="sal-table__th">USD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="sal-table__row">
                <td className="sal-table__label">Utilidades (bruto)</td>
                <td className="sal-table__cell">{fmt(result.utilidadesAnual)}</td>
                <td className="sal-table__cell">{fmt(result.utilidadesAnual / USD_PE)}</td>
              </tr>
              <tr className="sal-table__row">
                <td className="sal-table__label">Impuesto utilidades</td>
                <td className="sal-table__cell text-red">{fmt(result.impuestoUtilidades)}</td>
                <td className="sal-table__cell text-red">
                  {fmt(result.impuestoUtilidades / USD_PE)}
                </td>
              </tr>
              <tr className="sal-table__row is-highlight">
                <td className="sal-table__label">Utilidades neto</td>
                <td className="sal-table__cell">{fmt(result.utilidadesNeto)}</td>
                <td className="sal-table__cell">{fmt(result.utilidadesNeto / USD_PE)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

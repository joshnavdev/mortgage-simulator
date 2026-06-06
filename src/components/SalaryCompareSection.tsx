import type { CSSProperties } from "react";
import { fmt, fmtInt, getBest } from "@/lib/calc";
import { USD_PE } from "@/lib/salaryCalc";
import type { SalaryResult, SalarySavedSim } from "@/lib/salaryTypes";

type CSSVars = CSSProperties & Record<`--${string}`, string>;

type DataRow = {
  type?: undefined;
  label: string;
  fn: (r: SalaryResult) => number;
  format: (v: number) => string;
  best?: "min" | "max";
  hl?: boolean;
};

type SepRow = { type: "sep"; id: string };

type CompareRow = DataRow | SepRow;

const pen = (v: number): string => "S/ " + fmtInt(v);
const penDec = (v: number): string => "S/ " + fmt(v);

const ROWS: readonly CompareRow[] = [
  { label: "Sueldo bruto mensual", fn: (r) => r.sueldoBrutoMensual, format: penDec, best: "max" },
  { label: "Total anual (bruto)", fn: (r) => r.totalAnualBruto, format: pen, best: "max" },
  { type: "sep", id: "sep-bruto" },
  { label: "AFP mensual", fn: (r) => r.afpMensual, format: penDec, best: "min" },
  { label: "Impuesto mensual", fn: (r) => r.impuestoMensual, format: penDec, best: "min" },
  { label: "Impuesto anual", fn: (r) => r.impuestoAnual, format: pen, best: "min" },
  { type: "sep", id: "sep-aportes" },
  {
    label: "Neto mensual",
    fn: (r) => r.netoFinalMensual,
    format: penDec,
    best: "max",
    hl: true,
  },
  {
    label: "Neto mensual (USD)",
    fn: (r) => r.netoFinalMensual / USD_PE,
    format: (v) => "$ " + fmt(v),
    best: "max",
  },
  {
    label: "Ahorro mensual",
    fn: (r) => {
      const last = r.stages[r.stages.length - 1];
      return last ? last.ahorroMensual : 0;
    },
    format: penDec,
    best: "max",
    hl: true,
  },
  { type: "sep", id: "sep-neto" },
  { label: "Utilidades neto", fn: (r) => r.utilidadesNeto, format: pen, best: "max" },
];

type SalaryCompareSectionProps = { saved: SalarySavedSim[] };

export default function SalaryCompareSection({ saved }: SalaryCompareSectionProps) {
  return (
    <div className="compare">
      <div className="compare__title">Comparación de sueldos</div>
      <div className="compare__scroll">
        <table className="compare__table">
          <thead>
            <tr>
              <th className="compare__th-spacer" />
              {saved.map((s) => {
                const badgeStyle: CSSVars = { "--pill-color": s.color };
                return (
                  <th key={s.id} className="compare__th">
                    <span className="compare__name-badge" style={badgeStyle}>
                      {s.name}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              if (row.type === "sep") {
                return (
                  <tr key={row.id}>
                    <td colSpan={saved.length + 1} className="compare__separator" />
                  </tr>
                );
              }
              const vals = saved.map((s) => row.fn(s.result));
              const bestIdx = row.best ? getBest(vals, row.best) : -1;
              return (
                <tr key={row.label} className={"compare__row" + (row.hl ? " is-highlight" : "")}>
                  <td className="compare__label">{row.label}</td>
                  {saved.map((s, i) => (
                    <td key={s.id} className="compare__cell">
                      {row.format(vals[i] ?? 0)}
                      {i === bestIdx && <span className="compare__best-badge">mejor</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { fmt, formatDate } from "@/lib/calc";
import type { CalcResult } from "@/lib/types";

const HEADERS = [
  "N°",
  "Fecha",
  "Días",
  "Amort.",
  "Interés",
  "Seg.Desg.",
  "Seg.Inm.",
  "Cuota",
  "Saldo",
];

type CSSVars = CSSProperties & Record<`--${string}`, string>;

type CronoTableProps = {
  result: CalcResult;
  cronoMode: "simple" | "doble";
  visibleRows: number;
  setVisibleRows: Dispatch<SetStateAction<number>>;
};

export default function CronoTable({
  result,
  cronoMode,
  visibleRows,
  setVisibleRows,
}: CronoTableProps) {
  const isDoble = cronoMode === "doble";
  const crono = isDoble ? result.doble.cronograma : result.simple.cronograma;
  const accent = isDoble ? "#10b981" : "#6366f1";
  const style: CSSVars = { "--accent": accent };

  return (
    <div className="crono" style={style}>
      <div className="crono__header">
        {isDoble ? "Cuota doble — Jul y Dic se paga 2×" : "Cuota simple — mismo monto cada mes"}
      </div>
      <div className="crono__scroll">
        <table className="crono__table">
          <thead>
            <tr className="crono__thead-row">
              {HEADERS.map((h) => (
                <th key={h} className="crono__th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crono.slice(0, visibleRows).map((r) => {
              const rowClass = r.esDoble
                ? "crono__row is-doble"
                : r.mes % 2 === 0
                  ? "crono__row is-even"
                  : "crono__row";
              return (
                <tr key={r.mes} className={rowClass}>
                  <td className="crono__cell crono__cell--n">
                    {r.mes}
                    {r.esDoble && <span className="crono__doble-mark">×2</span>}
                  </td>
                  <td className="crono__cell crono__cell--fecha">{formatDate(r.fecha)}</td>
                  <td className="crono__cell crono__cell--dias">{r.dias}</td>
                  <td className="crono__cell crono__cell--amort">{fmt(r.amortizacion)}</td>
                  <td className="crono__cell crono__cell--interes">{fmt(r.interes)}</td>
                  <td className="crono__cell crono__cell--seg-desg">{fmt(r.seguroDesgravamen)}</td>
                  <td className="crono__cell crono__cell--seg-inm">{fmt(r.seguroInmueble)}</td>
                  <td className="crono__cell crono__cell--cuota">{fmt(r.cuotaFija)}</td>
                  <td className="crono__cell crono__cell--saldo">{fmt(r.saldo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleRows < crono.length && (
        <button
          onClick={() => setVisibleRows((v) => Math.min(v + 24, crono.length))}
          className="crono__more-btn"
        >
          Mostrar más ({crono.length - visibleRows} restantes)
        </button>
      )}
    </div>
  );
}

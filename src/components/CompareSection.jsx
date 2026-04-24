import { fmt, fmtInt, getBest } from "@/lib/calc";

const ROWS = [
  {
    label: "Precio inmueble",
    fn: (r) => parseFloat(r.params.precioInmueble) || null,
    format: (v) => (v ? "S/ " + fmtInt(v) : "—"),
  },
  {
    label: "Metraje",
    fn: (r) => parseFloat(r.params.metraje) || null,
    format: (v) => (v ? v.toFixed(2) + " m²" : "—"),
    best: "max",
  },
  {
    label: "Precio por m²",
    fn: (r) => {
      const p = parseFloat(r.params.precioInmueble),
        m = parseFloat(r.params.metraje);
      return p && m ? p / m : null;
    },
    format: (v) => (v ? "S/ " + fmtInt(v) + " /m²" : "—"),
    best: "min",
    hl: true,
  },
  { type: "sep" },
  {
    label: "Inicial",
    fn: (r) => {
      const p = parseFloat(r.params.precioInmueble),
        m = parseFloat(r.params.monto);
      return p && m ? p - m : null;
    },
    format: (v) => (v ? "S/ " + fmtInt(v) : "—"),
  },
  {
    label: "Monto prestado",
    fn: (r) => parseFloat(r.params.monto) || null,
    format: (v) => (v ? "S/ " + fmtInt(v) : "—"),
  },
  {
    label: "TEA",
    fn: (r) => parseFloat(r.params.tea) || null,
    format: (v) => (v ? v.toFixed(2) + "%" : "—"),
  },
  {
    label: "Plazo",
    fn: (r) => parseInt(r.params.plazo) || null,
    format: (v) => (v ? v + " meses" : "—"),
  },
  { type: "sep" },
  {
    label: "Cuota simple",
    fn: (r) => r.cuotaSimple,
    format: (v) => "S/ " + fmt(v),
    best: "min",
  },
  {
    label: "Cuota doble (normal)",
    fn: (r) => r.cuotaDoble,
    format: (v) => "S/ " + fmt(v),
    best: "min",
  },
  {
    label: "Cuota doble (Jul/Dic)",
    fn: (r) => r.cuotaDoble * 2,
    format: (v) => "S/ " + fmt(v),
    best: "min",
  },
  {
    label: "Mantenimiento",
    fn: (r) => parseFloat(r.params.mantenimiento) || 0,
    format: (v) => "S/ " + fmtInt(v),
  },
  { type: "sep" },
  {
    label: "Cuota simple + mant.",
    fn: (r) => r.cuotaSimple + (parseFloat(r.params.mantenimiento) || 0),
    format: (v) => "S/ " + fmt(v),
    best: "min",
    hl: true,
  },
  {
    label: "Cuota doble + mant.",
    fn: (r) => r.cuotaDoble + (parseFloat(r.params.mantenimiento) || 0),
    format: (v) => "S/ " + fmt(v),
    best: "min",
    hl: true,
  },
  {
    label: "Costo mensual por m²",
    fn: (r) => {
      const m = parseFloat(r.params.metraje),
        mt = parseFloat(r.params.mantenimiento) || 0;
      return m ? (r.cuotaSimple + mt) / m : null;
    },
    format: (v) => (v ? "S/ " + fmt(v) + " /m²" : "—"),
    best: "min",
    hl: true,
  },
  { type: "sep" },
  {
    label: "Total intereses (simple)",
    fn: (r) => r.simple.totalIntereses,
    format: (v) => "S/ " + fmtInt(v),
    best: "min",
  },
  {
    label: "Total intereses (doble)",
    fn: (r) => r.doble.totalIntereses,
    format: (v) => "S/ " + fmtInt(v),
    best: "min",
  },
  {
    label: "Ahorro por cuota doble",
    fn: (r) => r.simple.totalPagado - r.doble.totalPagado,
    format: (v) => "S/ " + fmtInt(v),
    best: "max",
    hl: true,
  },
  {
    label: "Total a pagar (simple)",
    fn: (r) => r.simple.totalPagado,
    format: (v) => "S/ " + fmtInt(v),
    best: "min",
    hl: true,
  },
  {
    label: "Total a pagar (doble)",
    fn: (r) => r.doble.totalPagado,
    format: (v) => "S/ " + fmtInt(v),
    best: "min",
    hl: true,
  },
];

const BARS = [
  {
    title: "Cuota simple + mantenimiento",
    fn: (s) =>
      s.result.cuotaSimple + (parseFloat(s.result.params.mantenimiento) || 0),
  },
  {
    title: "Precio por m²",
    fn: (s) => {
      const p = parseFloat(s.result.params.precioInmueble),
        m = parseFloat(s.result.params.metraje);
      return p && m ? p / m : 0;
    },
    suffix: " /m²",
    int: true,
  },
];

export default function CompareSection({ saved }) {
  return (
    <div className="compare">
      <div className="compare__title">Comparación</div>
      <div className="compare__scroll">
        <table className="compare__table">
          <thead>
            <tr>
              <th className="compare__th-spacer"></th>
              {saved.map((s, i) => (
                <th key={i} className="compare__th">
                  <span
                    className="compare__name-badge"
                    style={{ "--pill-color": s.color }}
                  >
                    {s.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              if (row.type === "sep")
                return (
                  <tr key={ri}>
                    <td
                      colSpan={saved.length + 1}
                      className="compare__separator"
                    />
                  </tr>
                );
              const vals = saved.map((s) => row.fn(s.result));
              const bestIdx = row.best ? getBest(vals, row.best) : -1;
              return (
                <tr
                  key={ri}
                  className={"compare__row" + (row.hl ? " is-highlight" : "")}
                >
                  <td className="compare__label">{row.label}</td>
                  {saved.map((s, i) => (
                    <td key={i} className="compare__cell">
                      {row.format(vals[i])}
                      {i === bestIdx && (
                        <span className="compare__best-badge">mejor</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {BARS.map(({ title, fn, suffix, int }, bi) => {
        const maxV = Math.max(...saved.map(fn));
        return (
          <div
            key={bi}
            className={
              "compare__bar-section" +
              (bi === 0 ? " compare__bar-section--first" : "")
            }
          >
            <div className="compare__bar-title">{title}</div>
            {saved.map((s, i) => {
              const v = fn(s);
              const widthPct = maxV > 0 ? (v / maxV) * 100 : 0;
              return (
                <div
                  key={i}
                  className="compare__bar-row"
                  style={{ "--pill-color": s.color }}
                >
                  <div className="compare__bar-header">
                    <span className="compare__bar-name">{s.name}</span>
                    <span className="compare__bar-value">
                      S/ {int ? fmtInt(v) : fmt(v)}
                      {suffix || ""}
                    </span>
                  </div>
                  <div className="compare__bar-track">
                    <div
                      className="compare__bar-fill"
                      style={{ "--bar-width": widthPct + "%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export const fmt = (n: number): string =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtInt = (n: number): string => Math.round(n).toLocaleString("es-PE");

export const formatDate = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

export const COLORS: readonly string[] = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

export function getBest(
  vals: readonly (number | null | undefined)[],
  mode: "min" | "max" = "min",
): number {
  const nums = vals.map((v) => (typeof v === "number" && !isNaN(v) ? v : NaN));
  const valid = nums.filter((v) => !isNaN(v));
  const first = valid[0];
  if (valid.length < 2 || first === undefined) return -1;
  if (valid.every((v) => Math.abs(v - first) < 0.01)) return -1;
  const t = mode === "min" ? Math.min(...valid) : Math.max(...valid);
  return nums.findIndex((v) => Math.abs(v - t) < 0.01);
}

export const fmt = (n) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtInt = (n) => Math.round(n).toLocaleString("es-PE");

export const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const diffDays = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

function findFixedPayment(P, teaVal, n, seguroRate, inmueble, fd, fv, doble) {
  const td = Math.pow(1 + teaVal, 1 / 360) - 1;
  const sim = (C) => {
    let s = P,
      fa = new Date(fd);
    for (let i = 0; i < n; i++) {
      const dias = diffDays(fa, fv[i]);
      const int = s * td * dias;
      const seg = s * seguroRate * (dias / 30) + inmueble;
      const m = fv[i].getMonth();
      const cp = doble && (m === 6 || m === 11) ? C * 2 : C;
      s -= cp - int - seg;
      fa = fv[i];
    }
    return s;
  };
  let lo = 0,
    hi = P * 0.05;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const sf = sim(mid);
    if (Math.abs(sf) < 0.005) return mid;
    if (sf > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function buildCrono(
  P,
  teaVal,
  n,
  seguroRate,
  inmueble,
  fd,
  fv,
  cuotaFija,
  doble,
) {
  const td = Math.pow(1 + teaVal, 1 / 360) - 1;
  let saldo = P;
  const crono = [];
  let fa = new Date(fd);
  let nd = 0;
  for (let i = 0; i < n; i++) {
    const dias = diffDays(fa, fv[i]);
    const interes = saldo * td * dias;
    const segDesg = saldo * seguroRate * (dias / 30);
    const totalSeg = segDesg + inmueble;
    const m = fv[i].getMonth();
    const esDoble = doble && (m === 6 || m === 11);
    if (esDoble) nd++;
    const cp = esDoble ? cuotaFija * 2 : cuotaFija;
    const amort = cp - interes - totalSeg;
    const ns = Math.max(0, saldo - amort);
    crono.push({
      mes: i + 1,
      fecha: fv[i],
      dias,
      esDoble,
      cuotaFija: cp,
      interes,
      amortizacion: amort,
      seguroDesgravamen: segDesg,
      seguroInmueble: inmueble,
      totalSeguros: totalSeg,
      saldo: ns,
    });
    saldo = ns;
    fa = fv[i];
  }
  return { crono, numDobles: nd };
}

export function runCalc(params) {
  const {
    monto,
    tea,
    plazo,
    seguroTasa,
    seguroInmueble,
    fechaInicio,
    diaPago,
  } = params;
  const P = parseFloat(monto);
  const teaVal = parseFloat(tea) / 100;
  const n = parseInt(plazo);
  const seguro = parseFloat(seguroTasa) / 100;
  const inm = parseFloat(seguroInmueble) || 0;
  const dia = parseInt(diaPago);
  if (!P || !teaVal || !n || !fechaInicio) return null;
  const td = Math.pow(1 + teaVal, 1 / 360) - 1;
  const tem = Math.pow(1 + teaVal, 1 / 12) - 1;
  const partes = fechaInicio.split(/[/-]/);
  let fd;
  if (partes[0].length === 4)
    fd = new Date(
      parseInt(partes[0]),
      parseInt(partes[1]) - 1,
      parseInt(partes[2]),
    );
  else
    fd = new Date(
      parseInt(partes[2]),
      parseInt(partes[1]) - 1,
      parseInt(partes[0]),
    );
  if (isNaN(fd.getTime())) return null;
  const fv = [];
  for (let i = 1; i <= n; i++) {
    const b = addMonths(fd, i);
    if (dia >= 1 && dia <= 28) b.setDate(dia);
    fv.push(new Date(b));
  }

  const cuotaSimple = findFixedPayment(
    P,
    teaVal,
    n,
    seguro,
    inm,
    fd,
    fv,
    false,
  );
  const cuotaDoble = findFixedPayment(P, teaVal, n, seguro, inm, fd, fv, true);
  const simple = buildCrono(
    P,
    teaVal,
    n,
    seguro,
    inm,
    fd,
    fv,
    cuotaSimple,
    false,
  );
  const doble = buildCrono(P, teaVal, n, seguro, inm, fd, fv, cuotaDoble, true);

  const totals = (c) => ({
    totalPagado: c.reduce((s, r) => s + r.cuotaFija, 0),
    totalIntereses: c.reduce((s, r) => s + r.interes, 0),
    totalSeguroDesg: c.reduce((s, r) => s + r.seguroDesgravamen, 0),
    totalSeguroInm: inm * n,
    totalSeguros: c.reduce((s, r) => s + r.seguroDesgravamen, 0) + inm * n,
    totalAmort: c.reduce((s, r) => s + r.amortizacion, 0),
  });

  return {
    cuotaSimple,
    cuotaDoble,
    tem,
    tasaDiaria: td,
    simple: { ...totals(simple.crono), cronograma: simple.crono },
    doble: {
      ...totals(doble.crono),
      cronograma: doble.crono,
      numDobles: doble.numDobles,
    },
  };
}

export const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

export function getBest(vals, mode = "min") {
  const nums = vals.map((v) => (typeof v === "number" && !isNaN(v) ? v : NaN));
  const valid = nums.filter((v) => !isNaN(v));
  if (valid.length < 2 || valid.every((v) => Math.abs(v - valid[0]) < 0.01))
    return -1;
  const t = mode === "min" ? Math.min(...valid) : Math.max(...valid);
  return nums.findIndex((v) => Math.abs(v - t) < 0.01);
}

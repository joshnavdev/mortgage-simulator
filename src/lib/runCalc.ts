import { Temporal } from "temporal-polyfill";
import MortgageCalculator, { type ScheduleRow } from "@/lib/mortgageCalculator";
import type {
  CalcParams,
  CalcResult,
  CronoRow,
  DobleSchedule,
  ScheduleTotals,
  SimpleSchedule,
} from "@/lib/types";

const DOBLE_MONTHS: readonly number[] = [7, 12];

function parseDisbursementDate(fechaInicio: string): Temporal.PlainDate | null {
  const partes = fechaInicio.split(/[/-]/);
  const p0 = partes[0];
  const p1 = partes[1];
  const p2 = partes[2];
  if (!p0 || !p1 || !p2) return null;
  const year = p0.length === 4 ? parseInt(p0) : parseInt(p2);
  const month = parseInt(p1);
  const day = p0.length === 4 ? parseInt(p2) : parseInt(p0);
  if (!year || !month || !day) return null;
  try {
    return Temporal.PlainDate.from({ year, month, day });
  } catch {
    return null;
  }
}

function plainDateStringToDate(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => parseInt(x));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function toCrono(s: ScheduleRow): CronoRow {
  return {
    mes: s.number,
    fecha: plainDateStringToDate(s.date),
    dias: s.days,
    esDoble: s.isDoublePayment,
    cuotaFija: s.totalPayment,
    interes: s.interest,
    amortizacion: s.amortization,
    seguroDesgravamen: s.desgravamen,
    seguroInmueble: s.propertyInsurance,
    totalSeguros: s.desgravamen + s.propertyInsurance,
    saldo: s.balance,
  };
}

function computeTotals(crono: readonly CronoRow[]): ScheduleTotals {
  return {
    totalPagado: crono.reduce((s, r) => s + r.cuotaFija, 0),
    totalIntereses: crono.reduce((s, r) => s + r.interes, 0),
    totalSeguroDesg: crono.reduce((s, r) => s + r.seguroDesgravamen, 0),
    totalSeguroInm: crono.reduce((s, r) => s + r.seguroInmueble, 0),
    totalSeguros: crono.reduce((s, r) => s + r.totalSeguros, 0),
    totalAmort: crono.reduce((s, r) => s + r.amortizacion, 0),
  };
}

export function runCalc(params: CalcParams): CalcResult | null {
  const { monto, tea, plazo, seguroTasa, seguroInmueble, fechaInicio, diaPago, precioInmueble } =
    params;
  const loanAmount = parseFloat(monto);
  const teaVal = parseFloat(tea) / 100;
  const paymentTerm = parseInt(plazo);
  const paymentDay = parseInt(diaPago);
  const propertyAmount = parseFloat(precioInmueble);
  const seguroDesgravamenMensualPct = parseFloat(seguroTasa) / 100;
  const seguroInmuebleMensualPct = parseFloat(seguroInmueble) || 0;

  if (!loanAmount || !teaVal || !paymentTerm || !fechaInicio) return null;

  const disbursementDate = parseDisbursementDate(fechaInicio);
  if (!disbursementDate) return null;

  const td = seguroDesgravamenMensualPct;
  const tm = seguroInmuebleMensualPct / 100;

  const simpleCls = new MortgageCalculator(
    disbursementDate,
    paymentDay,
    propertyAmount,
    loanAmount,
    teaVal,
    paymentTerm,
    td,
    tm,
    0,
    [],
  );
  const dobleCls = new MortgageCalculator(
    disbursementDate,
    paymentDay,
    propertyAmount,
    loanAmount,
    teaVal,
    paymentTerm,
    td,
    tm,
    0,
    [...DOBLE_MONTHS],
  );

  const cuotaSimple = simpleCls.findConstantPayment(loanAmount);
  const cuotaDoble = dobleCls.findConstantPayment(loanAmount);
  const simpleRows = simpleCls.generateSchedule().map(toCrono);
  const dobleRows = dobleCls.generateSchedule().map(toCrono);

  const simple: SimpleSchedule = {
    ...computeTotals(simpleRows),
    cronograma: simpleRows,
  };
  const doble: DobleSchedule = {
    ...computeTotals(dobleRows),
    cronograma: dobleRows,
    numDobles: dobleRows.filter((r) => r.esDoble).length,
  };

  return {
    cuotaSimple,
    cuotaDoble,
    tem: Math.pow(1 + teaVal, 1 / 12) - 1,
    tasaDiaria: Math.pow(1 + teaVal, 1 / 360) - 1,
    simple,
    doble,
  };
}

import type { NetoStage, SalaryInputs, SalaryResult } from "@/lib/salaryTypes";

export const UIT = 5500;
export const BONO_EXTRA_RATE = 0.09;
export const USD_PE = 3.5;
export const DEDUCCIONES_4TA = 0.2;

type TaxBracket = { min: number; max: number; rate: number };

export const IMPUESTO_RANGOS: ReadonlyArray<TaxBracket> = [
  { min: 0, max: 5, rate: 0.08 },
  { min: 5, max: 20, rate: 0.14 },
  { min: 20, max: 35, rate: 0.17 },
  { min: 35, max: 45, rate: 0.2 },
  { min: 45, max: Infinity, rate: 0.3 },
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function calcularGratificacion(sueldo5ta: number): number {
  return sueldo5ta * (1 + BONO_EXTRA_RATE);
}

export function calcularGratificacionAnual(sueldo5ta: number): number {
  return calcularGratificacion(sueldo5ta) * 2;
}

export function calcularCts(sueldo5ta: number, ignorarCts: boolean): number {
  if (ignorarCts || sueldo5ta <= 0) return 0;
  return (sueldo5ta / 12) * 13;
}

export function calcularUtilidades(sueldo5ta: number, factor: number): number {
  if (sueldo5ta <= 0) return 0;
  return sueldo5ta * factor;
}

export function calcularSueldoAnualNeto5ta(sueldo5ta: number): number {
  return sueldo5ta * 12 + calcularGratificacionAnual(sueldo5ta);
}

export function calcularSueldoAnualNeto4ta(
  sueldo4ta: number,
  isUsd: boolean,
  workingMonths: number,
): { anual: number; neto: number } {
  const sueldoReal = isUsd ? sueldo4ta * USD_PE : sueldo4ta;
  const anual = sueldoReal * workingMonths;
  const deducciones = anual * DEDUCCIONES_4TA;
  return { anual, neto: anual - deducciones };
}

export function calcularBaseRecurrente(inputs: SalaryInputs): number {
  const { neto: neto4ta } = calcularSueldoAnualNeto4ta(
    inputs.sueldo4ta,
    inputs.isUsd,
    inputs.workingMonths4ta,
  );
  const neto5ta = calcularSueldoAnualNeto5ta(inputs.sueldo5ta);
  const cts = calcularCts(inputs.sueldo5ta, inputs.ignorarCts);
  return round2(neto5ta + neto4ta + cts);
}

export function calcularImpuestosRenta(sueldoAnualBruto: number): number {
  const deducciones = 7 * UIT;
  const sad = sueldoAnualBruto - deducciones;
  return IMPUESTO_RANGOS.reduce((total, { min, max, rate }) => {
    const montoRango = Math.min(sad, max * UIT) - min * UIT;
    return total + Math.max(0, montoRango) * rate;
  }, 0);
}

export function calcularImpuestoUtilidades(inputs: SalaryInputs): number {
  const baseRecurrente = calcularBaseRecurrente(inputs);
  const utilidades = calcularUtilidades(inputs.sueldo5ta, inputs.utilidadesFactor);
  if (utilidades <= 0) return 0;
  const impuestoSin = calcularImpuestosRenta(baseRecurrente);
  const impuestoCon = calcularImpuestosRenta(baseRecurrente + utilidades);
  return round2(impuestoCon - impuestoSin);
}

export function getSueldoBrutoMensual(inputs: SalaryInputs): number {
  const sueldoReal4ta = inputs.sueldo4ta * USD_PE;
  return sueldoReal4ta + inputs.sueldo5ta;
}

export function runSalaryCalc(inputs: SalaryInputs): SalaryResult {
  const sueldoBrutoMensual = getSueldoBrutoMensual(inputs);

  const baseRecurrente = calcularBaseRecurrente(inputs);
  const impuestoAnual = calcularImpuestosRenta(baseRecurrente);
  const impuestoMensual = impuestoAnual / 12;

  const afpMensual = inputs.sueldo5ta > 0 ? 0.1 * inputs.sueldo5ta : 0;

  const gratiAnual =
    !inputs.ignorarGrati && inputs.sueldo5ta > 0 ? calcularGratificacionAnual(inputs.sueldo5ta) : 0;
  const gratiMensual = gratiAnual / 12;

  const ctsAnual = calcularCts(inputs.sueldo5ta, inputs.ignorarCts);
  const ctsMensual = ctsAnual / 12;

  const sueldoAnual = sueldoBrutoMensual * 12;
  const utilidadesAnual = calcularUtilidades(inputs.sueldo5ta, inputs.utilidadesFactor);
  const totalAnualBruto = sueldoAnual + gratiAnual + ctsAnual + utilidadesAnual;

  const netoBase = sueldoBrutoMensual - impuestoMensual - afpMensual;
  const netoConGrati = netoBase + gratiMensual;
  const netoConCts = netoConGrati + ctsMensual;

  const makeStage = (label: string, neto: number): NetoStage => ({
    label,
    netoMensual: neto,
    ahorroMensual: neto - inputs.gastoMensual,
  });

  const stages: NetoStage[] = [
    makeStage("neto (solo sueldo)", netoBase),
    makeStage("neto + grati", netoConGrati),
    makeStage("neto + grati + cts", netoConCts),
  ];

  const impuestoUtilidades = calcularImpuestoUtilidades(inputs);
  const utilidadesNeto = utilidadesAnual - impuestoUtilidades;

  return {
    inputs,
    sueldoBrutoMensual,
    sueldoAnual,
    gratiAnual,
    gratiMensual,
    ctsAnual,
    ctsMensual,
    utilidadesAnual,
    totalAnualBruto,
    afpMensual,
    impuestoAnual,
    impuestoMensual,
    stages,
    netoFinalMensual: netoConCts,
    impuestoUtilidades,
    utilidadesNeto,
  };
}

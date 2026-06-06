export type SalaryFormValues = {
  sueldo5ta: string;
  sueldo4ta: string;
  gastoMensual: string;
  isUsd: boolean;
  ignorarGrati: boolean;
  ignorarCts: boolean;
  utilidadesFactor: string;
  workingMonths4ta: string;
};

export type SalaryInputs = {
  sueldo5ta: number;
  sueldo4ta: number;
  gastoMensual: number;
  isUsd: boolean;
  ignorarGrati: boolean;
  ignorarCts: boolean;
  utilidadesFactor: number;
  workingMonths4ta: number;
};

export type NetoStage = {
  label: string;
  netoMensual: number;
  ahorroMensual: number;
};

export type SalaryResult = {
  inputs: SalaryInputs;
  sueldoBrutoMensual: number;
  sueldoAnual: number;
  gratiAnual: number;
  gratiMensual: number;
  ctsAnual: number;
  ctsMensual: number;
  utilidadesAnual: number;
  totalAnualBruto: number;
  afpMensual: number;
  impuestoAnual: number;
  impuestoMensual: number;
  stages: NetoStage[];
  netoFinalMensual: number;
  impuestoUtilidades: number;
  utilidadesNeto: number;
};

export type SalarySavedSim = {
  id: string;
  name: string;
  result: SalaryResult;
  color: string;
};

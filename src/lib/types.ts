export type FormValues = {
  precioInmueble: string;
  cuotaInicialPct: string;
  tea: string;
  plazoAnios: string;
  seguroTasa: string;
  seguroInmueble: string;
  mantenimiento: string;
  metraje: string;
  fechaInicio: string;
  diaPago: string;
};

export type CalcParams = FormValues & {
  monto: string;
  plazo: string;
};

export type CronoRow = {
  mes: number;
  fecha: Date;
  dias: number;
  esDoble: boolean;
  cuotaFija: number;
  interes: number;
  amortizacion: number;
  seguroDesgravamen: number;
  seguroInmueble: number;
  totalSeguros: number;
  saldo: number;
};

export type ScheduleTotals = {
  totalPagado: number;
  totalIntereses: number;
  totalSeguroDesg: number;
  totalSeguroInm: number;
  totalSeguros: number;
  totalAmort: number;
};

export type SimpleSchedule = ScheduleTotals & { cronograma: CronoRow[] };
export type DobleSchedule = ScheduleTotals & { cronograma: CronoRow[]; numDobles: number };

export type CalcResult = {
  cuotaSimple: number;
  cuotaDoble: number;
  tem: number;
  tasaDiaria: number;
  simple: SimpleSchedule;
  doble: DobleSchedule;
  params?: CalcParams;
};

export type SavedSim = { id: string; name: string; result: CalcResult; color: string };

export type CronoMode = "simple" | "doble" | null;

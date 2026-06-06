import { Temporal } from "temporal-polyfill";

export interface ScheduleRow {
  number: number;
  date: string;
  days: number;
  balance: number;
  amortization: number;
  interest: number;
  desgravamen: number;
  propertyInsurance: number;
  portes: number;
  totalPayment: number;
  isDoublePayment: boolean;
}

export default class MortgageCalculator {
  disbursementDate: Temporal.PlainDate;
  paymentDay: number;
  propertyAmount: number;
  loanAmount: number;
  tea: number;
  paymentTerm: number;
  td: number;
  tm: number;
  portes: number;
  doublePaymentMonths: number[];

  tna: number;
  tda: number;
  tma: number;

  constructor(
    disbursementDate: Temporal.PlainDate,
    paymentDay: number,
    propertyAmount: number,
    loanAmount: number,
    tea: number,
    paymentTerm: number,
    td: number,
    tm: number,
    portes: number = 3.8,
    doublePaymentMonths: number[] = [],
  ) {
    this.disbursementDate = disbursementDate;
    this.paymentDay = paymentDay;
    this.propertyAmount = propertyAmount;
    this.loanAmount = loanAmount;
    this.tea = tea;
    this.paymentTerm = paymentTerm;
    this.td = td;
    this.tm = tm;
    this.portes = portes;
    this.doublePaymentMonths = doublePaymentMonths;

    this.tna = (Math.pow(1 + this.tea, 1 / 12) - 1) * 12 * (365 / 360);
    this.tda = this.td * 12;
    this.tma = this.tm * 12;
  }

  getDaysInPeriod(
    startDate: Temporal.PlainDate,
    endDate: Temporal.PlainDate,
    isFirstPeriod: boolean = false,
  ): number {
    const days = startDate.until(endDate).total("days");
    return isFirstPeriod ? days + 1 : days;
  }

  getInterestRate(days: number): number {
    return (this.tna / 365) * days;
  }

  getDesgravamenRate(days: number): number {
    return (this.tda / 360) * days;
  }

  getPropertyInsuranceRate(days: number): number {
    return (this.tma / 360) * days;
  }

  getReferencePayment(balance: number): number {
    const i30 = this.getInterestRate(30);
    return balance * (i30 / (1 - Math.pow(1 + i30, -this.paymentTerm)));
  }

  getNextPaymentDate(monthsToAdd: number): Temporal.PlainDate {
    const base = this.disbursementDate.add({ months: monthsToAdd });
    if (this.paymentDay >= 1 && this.paymentDay <= 28) return base.with({ day: this.paymentDay });
    return base;
  }

  isDoublePaymentMonth(date: Temporal.PlainDate): boolean {
    return this.doublePaymentMonths.includes(date.month);
  }

  private simulateTotalAmortization(cuota: number, initialBalance: number): number {
    let balance = initialBalance;
    let currentDate = this.disbursementDate;
    let totalAmortization = 0;

    for (let i = 1; i <= this.paymentTerm; i++) {
      const nextDate = this.getNextPaymentDate(i);
      const isFirst = i === 1;
      const days = this.getDaysInPeriod(currentDate, nextDate, isFirst);

      const interest = balance * this.getInterestRate(days);
      const desgravamen = balance * this.getDesgravamenRate(days);
      const propertyInsurance = this.propertyAmount * this.getPropertyInsuranceRate(days);

      const isDouble = this.isDoublePaymentMonth(nextDate);
      const extraAmortization = isDouble ? cuota : 0;

      const amortization =
        cuota - interest - desgravamen - propertyInsurance - this.portes + extraAmortization;
      totalAmortization += amortization;
      balance -= amortization;

      currentDate = nextDate;
    }

    return totalAmortization;
  }

  findConstantPayment(initialBalance: number): number {
    const tolerance = 0.005;
    const reference =
      this.getReferencePayment(initialBalance) +
      this.loanAmount * this.td +
      this.propertyAmount * this.tm +
      this.portes;

    let lo = 0;
    let hi = Math.max(reference * 4, 1);
    for (let iter = 0; iter < 200; iter++) {
      const mid = (lo + hi) / 2;
      const total = this.simulateTotalAmortization(mid, initialBalance);
      const error = total - initialBalance;
      if (Math.abs(error) < tolerance) return this.round2(mid);
      if (error > 0) hi = mid;
      else lo = mid;
    }
    return this.round2((lo + hi) / 2);
  }

  generateSchedule(): ScheduleRow[] {
    const schedule: ScheduleRow[] = [];
    let balance = this.loanAmount;
    let currentDate = this.disbursementDate;
    const cuota = this.findConstantPayment(balance);

    for (let i = 1; i <= this.paymentTerm; i++) {
      const nextDate = this.getNextPaymentDate(i);
      const isFirst = i === 1;
      const days = this.getDaysInPeriod(currentDate, nextDate, isFirst);

      const desgravamen = this.round2(balance * this.getDesgravamenRate(days));
      const propertyInsurance = this.round2(
        this.propertyAmount * this.getPropertyInsuranceRate(days),
      );
      let interest = this.round2(balance * this.getInterestRate(days));

      if (interest > cuota - desgravamen - propertyInsurance - this.portes) {
        interest = cuota - desgravamen - propertyInsurance - this.portes;
      }

      const isDouble = this.isDoublePaymentMonth(nextDate);
      const extraAmortization = isDouble ? cuota : 0;

      const amortization = this.round2(
        cuota - interest - desgravamen - propertyInsurance - this.portes + extraAmortization,
      );
      balance = this.round2(balance - amortization);

      const totalPayment = this.round2(cuota + extraAmortization);

      schedule.push({
        number: i,
        date: nextDate.toString(),
        days,
        balance,
        amortization,
        interest,
        desgravamen,
        propertyInsurance,
        portes: this.portes,
        totalPayment,
        isDoublePayment: isDouble,
      });

      currentDate = nextDate;
    }

    return schedule;
  }

  round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

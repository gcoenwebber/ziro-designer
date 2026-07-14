/**
 * Adjustable-regulator divider maths with worst-case (min/typ/max) analysis.
 * Counterpart: KiCad `pcb_calculator/calculator_panels/panel_regulator.cpp`
 * + `pcb_calculator/class_regulator_data.h`.
 *
 * 3-terminal type:  Vout = Vref · (R1 + R2) / R1 + Iadj · R2
 * Standard type:    Vout = Vref · (R1 + R2) / R1
 * (R1 from output to ADJ/FB, R2 from ADJ/FB to ground — as drawn on the panel.)
 */

export enum RegulatorType {
  STANDARD = 0,
  THREE_TERMINAL = 1,
}

export interface RegulatorData {
  name: string;
  vrefMin: number;
  vrefTyp: number;
  vrefMax: number;
  /** Adjust-pin current in amps (3-terminal type only). */
  iadjTyp: number;
  iadjMax: number;
  type: RegulatorType;
}

/** Ships with the tool, like KiCad's default `pcb_calculator.ini` datafile. */
export const BUILTIN_REGULATORS: readonly RegulatorData[] = [
  {
    name: 'LM317',
    vrefMin: 1.2,
    vrefTyp: 1.25,
    vrefMax: 1.3,
    iadjTyp: 50e-6,
    iadjMax: 100e-6,
    type: RegulatorType.THREE_TERMINAL,
  },
  {
    name: 'LM1117',
    vrefMin: 1.225,
    vrefTyp: 1.25,
    vrefMax: 1.275,
    iadjTyp: 60e-6,
    iadjMax: 120e-6,
    type: RegulatorType.THREE_TERMINAL,
  },
  {
    name: 'LT1086',
    vrefMin: 1.225,
    vrefTyp: 1.25,
    vrefMax: 1.27,
    iadjTyp: 55e-6,
    iadjMax: 120e-6,
    type: RegulatorType.THREE_TERMINAL,
  },
  {
    name: 'LM2596',
    vrefMin: 1.193,
    vrefTyp: 1.23,
    vrefMax: 1.267,
    iadjTyp: 0,
    iadjMax: 0,
    type: RegulatorType.STANDARD,
  },
  {
    name: 'TL431',
    vrefMin: 2.44,
    vrefTyp: 2.495,
    vrefMax: 2.55,
    iadjTyp: 2e-6,
    iadjMax: 4e-6,
    type: RegulatorType.THREE_TERMINAL,
  },
];

export enum RegulatorSolve {
  R1 = 0,
  R2 = 1,
  VOUT = 2,
}

export interface RegulatorParams {
  type: RegulatorType;
  /** Which quantity to solve for; the other two must carry `typ` values. */
  solve: RegulatorSolve;
  r1Typ: number; // ohms
  r2Typ: number; // ohms
  voutTyp: number; // volts
  vrefMin: number;
  vrefTyp: number;
  vrefMax: number;
  iadjTyp: number; // amps (0 for standard type)
  iadjMax: number; // amps
  /** Resistor tolerance in percent (e.g. 1). */
  resTolPct: number;
}

export interface RegulatorResult {
  r1: { min: number; typ: number; max: number };
  r2: { min: number; typ: number; max: number };
  vout: { min: number; typ: number; max: number };
  /** Overall output tolerance vs typ, percent (negative and positive side). */
  tolNegPct: number;
  tolPosPct: number;
  error?: string;
}

const voutOf = (vref: number, iadj: number, r1: number, r2: number): number =>
  vref * ((r1 + r2) / r1) + iadj * r2;

const r1Of = (vref: number, iadj: number, vout: number, r2: number): number =>
  (vref * r2) / (vout - vref - iadj * r2);

const r2Of = (vref: number, iadj: number, vout: number, r1: number): number =>
  ((vout - vref) * r1) / (vref + iadj * r1);

/**
 * Solve the divider, then sweep every worst-case corner (Vref, Iadj, both
 * resistor tolerances) for the min/typ/max columns shown on the panel.
 */
export function solveRegulator(p: RegulatorParams): RegulatorResult {
  const iadjTyp = p.type === RegulatorType.STANDARD ? 0 : p.iadjTyp;
  const iadjMax = p.type === RegulatorType.STANDARD ? 0 : p.iadjMax;
  const iadjMin = 0; // datasheets specify typ/max only; worst-case low is 0

  let r1 = p.r1Typ;
  let r2 = p.r2Typ;
  let vout = p.voutTyp;

  if (p.solve === RegulatorSolve.R1) r1 = r1Of(p.vrefTyp, iadjTyp, vout, r2);
  else if (p.solve === RegulatorSolve.R2) r2 = r2Of(p.vrefTyp, iadjTyp, vout, r1);
  else vout = voutOf(p.vrefTyp, iadjTyp, r1, r2);

  const bad = (v: number): boolean => !Number.isFinite(v) || v <= 0;
  if (bad(r1) || bad(r2) || bad(vout)) {
    return {
      r1: nan3(),
      r2: nan3(),
      vout: nan3(),
      tolNegPct: NaN,
      tolPosPct: NaN,
      error:
        p.solve === RegulatorSolve.R1
          ? 'No solution: Vout must exceed Vref (check R2 / Iadj).'
          : p.solve === RegulatorSolve.R2
            ? 'No solution: Vout must exceed Vref.'
            : 'Invalid input values.',
    };
  }

  const tol = p.resTolPct / 100;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const vref of [p.vrefMin, p.vrefMax]) {
    for (const iadj of [iadjMin, iadjMax]) {
      for (const kr1 of [1 - tol, 1 + tol]) {
        for (const kr2 of [1 - tol, 1 + tol]) {
          const v = voutOf(vref, iadj, r1 * kr1, r2 * kr2);
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
      }
    }
  }

  return {
    r1: { min: r1 * (1 - tol), typ: r1, max: r1 * (1 + tol) },
    r2: { min: r2 * (1 - tol), typ: r2, max: r2 * (1 + tol) },
    vout: { min: vMin, typ: vout, max: vMax },
    tolNegPct: ((vMin - vout) / vout) * 100,
    tolPosPct: ((vMax - vout) / vout) * 100,
  };
}

const nan3 = (): { min: number; typ: number; max: number } => ({
  min: NaN,
  typ: NaN,
  max: NaN,
});

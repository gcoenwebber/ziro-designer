/**
 * Microstrip line analysis/synthesis — Hammerstad–Jensen quasi-static model
 * with thickness correction and standard loss formulas.
 * Counterpart: KiCad `pcb_calculator/transline/microstrip.cpp`.
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  C0,
  ETA0,
  bisectSolve,
  electricalLengthDeg,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface MicrostripPhysical {
  /** Trace width, m. */
  widthM: number;
  /** Substrate height, m. */
  heightM: number;
  /** Copper thickness, m. */
  thicknessM: number;
  /** Line length, m. */
  lengthM: number;
}

/** Hammerstad–Jensen Z0 of a microstrip in a homogeneous medium (εr = 1). */
function z01(u: number): number {
  const fu = 6 + (2 * Math.PI - 6) * Math.exp(-((30.666 / u) ** 0.7528));
  return (ETA0 / (2 * Math.PI)) * Math.log(fu / u + Math.sqrt(1 + (2 / u) ** 2));
}

/** Hammerstad–Jensen effective permittivity (zero thickness). */
function epsEffStatic(u: number, er: number): number {
  const a =
    1 +
    (1 / 49) * Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) +
    (1 / 18.7) * Math.log(1 + (u / 18.1) ** 3);
  const b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053;
  return (er + 1) / 2 + ((er - 1) / 2) * (1 + 10 / u) ** (-a * b);
}

/** Effective width increase from conductor thickness (Hammerstad–Jensen). */
function thicknessCorrection(u: number, tNorm: number, er: number): { u1: number; ur: number } {
  if (tNorm <= 0) return { u1: u, ur: u };
  const du1 =
    (tNorm / Math.PI) *
    Math.log(1 + (4 * Math.E) / (tNorm * (1 / Math.tanh(Math.sqrt(6.517 * u))) ** 2));
  const dur = (du1 / 2) * (1 + 1 / Math.cosh(Math.sqrt(er - 1)));
  return { u1: u + du1, ur: u + dur };
}

export interface MicrostripResult extends TranslineAnalysis {
  /** Quasi-static values before dispersion (equal here; kept for the panel). */
  z0Static: number;
}

export function microstripAnalyze(
  phys: MicrostripPhysical,
  el: TranslineElectrical,
): MicrostripResult {
  const { widthM: w, heightM: h, thicknessM: t, lengthM: len } = phys;
  const er = el.epsilonR;
  const u = w / h;
  const tNorm = t / h;

  const { u1, ur } = thicknessCorrection(u, tNorm, er);
  const epsEffR = epsEffStatic(ur, er);
  // H-J thickness-corrected impedance.
  const zr = z01(ur) / Math.sqrt(epsEffR);
  const epsEff = epsEffR * (z01(u1) / z01(ur)) ** 2;

  const delta = skinDepth(el.frequencyHz, el.sigma, el.murC);

  // Conductor loss (Hammerstad-style): αc = Rs/(Z0·w) · correction, dB/m.
  const rs = 1 / (el.sigma * delta);
  const ki = Math.exp(-1.2 * (zr / ETA0) ** 0.7); // current-distribution factor
  const alphaCNp = (rs / (zr * w)) * ki;
  // Dielectric loss: αd = π·(εeff−1)·εr·tanδ / ((εr−1)·λ0·√εeff), Np/m.
  const lambda0 = C0 / el.frequencyHz;
  const alphaDNp =
    er > 1 ? (Math.PI * (epsEff - 1) * er * el.tanD) / ((er - 1) * lambda0 * Math.sqrt(epsEff)) : 0;
  const np2db = 8.685889638;

  return {
    z0: zr,
    z0Static: zr,
    epsEff,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEff),
    conductorLossDb: alphaCNp * np2db * len,
    dielectricLossDb: alphaDNp * np2db * len,
    skinDepthM: delta,
  };
}

/**
 * Synthesis: find the width giving `z0Target`, then the length for
 * `angleDeg`. Returns the updated physical dimensions.
 */
export function microstripSynthesize(
  phys: MicrostripPhysical,
  el: TranslineElectrical,
  z0Target: number,
  angleDeg: number,
): MicrostripPhysical | null {
  const h = phys.heightM;
  const zOf = (w: number): number => microstripAnalyze({ ...phys, widthM: w }, el).z0;
  // Z0 falls monotonically with width; bracket from hair-thin to very wide.
  const w = bisectSolve(zOf, z0Target, h * 1e-3, h * 100);
  if (!Number.isFinite(w)) return null;
  const epsEff = microstripAnalyze({ ...phys, widthM: w }, el).epsEff;
  return { ...phys, widthM: w, lengthM: physicalLengthM(angleDeg, el.frequencyHz, epsEff) };
}

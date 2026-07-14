/**
 * Symmetric stripline analysis/synthesis (Pozar's approximation).
 * Counterpart: KiCad `pcb_calculator/transline/stripline.cpp`.
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  C0,
  bisectSolve,
  electricalLengthDeg,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface StriplinePhysical {
  /** Strip width, m. */
  widthM: number;
  /** Ground-to-ground spacing b, m. */
  heightM: number;
  /** Strip thickness, m. */
  thicknessM: number;
  /** Line length, m. */
  lengthM: number;
}

export function striplineAnalyze(
  phys: StriplinePhysical,
  el: TranslineElectrical,
): TranslineAnalysis {
  const { widthM: w, heightM: b, thicknessM: t, lengthM: len } = phys;
  const er = el.epsilonR;
  // Effective width (Pozar): We = W − b·(0.35 − W/b)² for W/b < 0.35.
  const wb = w / (b - t);
  const weB = wb >= 0.35 ? wb : wb - (0.35 - wb) ** 2;
  const z0 = ((30 * Math.PI) / Math.sqrt(er)) * (1 / (weB + 0.441));
  const epsEff = er;

  const delta = skinDepth(el.frequencyHz, el.sigma, el.murC);
  const rs = 1 / (el.sigma * delta);
  // Pozar's stripline conductor-loss approximation.
  const np2db = 8.685889638;
  let alphaC: number;
  const zEr = z0 * Math.sqrt(er);
  if (zEr < 120) {
    const A =
      1 + (2 * w) / (b - t) + ((b + t) / (b - t) ** 2 / Math.PI) * Math.log((2 * b - t) / t);
    alphaC = (2.7e-3 * rs * er * z0 * A) / (30 * Math.PI * (b - t));
  } else {
    const B =
      1 +
      (b / (0.5 * w + 0.7 * t)) *
        (0.5 + (0.414 * t) / w + (1 / (2 * Math.PI)) * Math.log((4 * Math.PI * w) / t));
    alphaC = (0.16 * rs * B) / (z0 * b);
  }
  const alphaD = (Math.PI * Math.sqrt(er) * el.tanD * el.frequencyHz) / C0;

  return {
    z0,
    epsEff,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEff),
    conductorLossDb: alphaC * np2db * len,
    dielectricLossDb: alphaD * np2db * len,
    skinDepthM: delta,
  };
}

export function striplineSynthesize(
  phys: StriplinePhysical,
  el: TranslineElectrical,
  z0Target: number,
  angleDeg: number,
): StriplinePhysical | null {
  const zOf = (w: number): number => striplineAnalyze({ ...phys, widthM: w }, el).z0;
  const w = bisectSolve(zOf, z0Target, phys.heightM * 1e-4, phys.heightM * 50);
  if (!Number.isFinite(w)) return null;
  return {
    ...phys,
    widthM: w,
    lengthM: physicalLengthM(angleDeg, el.frequencyHz, el.epsilonR),
  };
}

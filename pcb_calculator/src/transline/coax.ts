/**
 * Coaxial line analysis/synthesis.
 * Counterpart: KiCad `pcb_calculator/transline/coax.cpp`.
 *
 * Z0 = η0 / (2π√εr) · ln(D/d); TE11 cutoff fc ≈ c / (π·(D+d)/2·√εr).
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  C0,
  ETA0,
  electricalLengthDeg,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface CoaxPhysical {
  /** Inner conductor diameter, m. */
  innerDiaM: number;
  /** Shield (outer conductor inner) diameter, m. */
  outerDiaM: number;
  /** Line length, m. */
  lengthM: number;
}

export interface CoaxResult extends TranslineAnalysis {
  extra: { te11CutoffHz: number };
}

export function coaxAnalyze(phys: CoaxPhysical, el: TranslineElectrical): CoaxResult {
  const { innerDiaM: d, outerDiaM: D, lengthM: len } = phys;
  const er = el.epsilonR;
  const z0 = (ETA0 / (2 * Math.PI * Math.sqrt(er))) * Math.log(D / d);
  const epsEff = er;

  const delta = skinDepth(el.frequencyHz, el.sigma, el.murC);
  const rs = 1 / (el.sigma * delta);
  // αc = Rs/(2·η)·(1/a + 1/b)/ln(b/a), Np/m (Pozar), a=d/2, b=D/2.
  const eta = ETA0 / Math.sqrt(er);
  const alphaC = (rs / (2 * eta * Math.log(D / d))) * (2 / d + 2 / D);
  // αd = π·√εr·tanδ/λ0, Np/m.
  const alphaD = (Math.PI * Math.sqrt(er) * el.tanD * el.frequencyHz) / C0;
  const np2db = 8.685889638;

  return {
    z0,
    epsEff,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEff),
    conductorLossDb: alphaC * np2db * len,
    dielectricLossDb: alphaD * np2db * len,
    skinDepthM: delta,
    extra: { te11CutoffHz: C0 / (Math.PI * ((D + d) / 2) * Math.sqrt(er)) },
  };
}

/** Synthesis: solve the inner diameter for Z0 (shield kept), then length. */
export function coaxSynthesize(
  phys: CoaxPhysical,
  el: TranslineElectrical,
  z0Target: number,
  angleDeg: number,
): CoaxPhysical | null {
  const d = phys.outerDiaM / Math.exp((z0Target * 2 * Math.PI * Math.sqrt(el.epsilonR)) / ETA0);
  if (!Number.isFinite(d) || d <= 0 || d >= phys.outerDiaM) return null;
  return {
    ...phys,
    innerDiaM: d,
    lengthM: physicalLengthM(angleDeg, el.frequencyHz, el.epsilonR),
  };
}

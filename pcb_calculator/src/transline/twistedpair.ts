/**
 * Twisted-pair line (Lefferson's model: twist pitch raises the effective
 * permittivity between the insulated wires).
 * Counterpart: KiCad `pcb_calculator/transline/twistedpair.cpp`.
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  ETA0,
  bisectSolve,
  electricalLengthDeg,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface TwistedPairPhysical {
  /** Bare conductor diameter, m. */
  dinM: number;
  /** Outer (insulation) diameter, m. */
  doutM: number;
  /** Twists per metre. */
  twistsPerM: number;
  /** Cable length, m. */
  lengthM: number;
}

export interface TwistedPairElectrical extends TranslineElectrical {
  /** Relative permittivity of the surrounding medium (usually air = 1). */
  epsilonRenv: number;
}

export function twistedPairAnalyze(
  phys: TwistedPairPhysical,
  el: TwistedPairElectrical,
): TranslineAnalysis {
  const { dinM: d, doutM: D, twistsPerM: T, lengthM: len } = phys;
  // Pitch angle of the twist: θ = atan(T·π·D).
  const thetaRad = Math.atan(T * Math.PI * D);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  // Lefferson: q = 0.25 + 0.0004·θ², θ in degrees; εeff mixes environment
  // and insulation permittivity.
  const q = 0.25 + 0.0004 * thetaDeg * thetaDeg;
  const epsEff = el.epsilonRenv + q * (el.epsilonR - el.epsilonRenv);

  const z0 = (ETA0 / (Math.PI * Math.sqrt(epsEff))) * Math.acosh(D / d);

  return {
    z0,
    epsEff,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEff),
    conductorLossDb: NaN,
    dielectricLossDb: NaN,
    skinDepthM: skinDepth(el.frequencyHz, el.sigma, el.murC),
  };
}

/** Synthesis: solve conductor diameter for Z0 (outer dia kept), then length. */
export function twistedPairSynthesize(
  phys: TwistedPairPhysical,
  el: TwistedPairElectrical,
  z0Target: number,
  angleDeg: number,
): TwistedPairPhysical | null {
  const zOf = (d: number): number => twistedPairAnalyze({ ...phys, dinM: d }, el).z0;
  const d = bisectSolve(zOf, z0Target, phys.doutM * 1e-4, phys.doutM * 0.9999);
  if (!Number.isFinite(d)) return null;
  const epsEff = twistedPairAnalyze({ ...phys, dinM: d }, el).epsEff;
  return { ...phys, dinM: d, lengthM: physicalLengthM(angleDeg, el.frequencyHz, epsEff) };
}

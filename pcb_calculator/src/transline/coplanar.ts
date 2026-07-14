/**
 * Coplanar waveguide (with and without bottom ground) — conformal-mapping
 * model on elliptic-integral ratios.
 * Counterpart: KiCad `pcb_calculator/transline/coplanar.cpp`.
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  ETA0,
  bisectSolve,
  electricalLengthDeg,
  ellipticRatio,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface CoplanarPhysical {
  /** Centre-strip width, m. */
  widthM: number;
  /** Gap between strip and coplanar grounds, m. */
  gapM: number;
  /** Substrate height, m. */
  heightM: number;
  /** Line length, m. */
  lengthM: number;
}

export function coplanarAnalyze(
  phys: CoplanarPhysical,
  el: TranslineElectrical,
  withGround: boolean,
): TranslineAnalysis {
  const { widthM: w, gapM: s, heightM: h, lengthM: len } = phys;
  const er = el.epsilonR;
  const a = w;
  const b = w + 2 * s;

  const k = a / b;
  const rk = ellipticRatio(k); // K(k)/K'(k)

  let epsEff: number;
  let z0: number;
  if (!withGround) {
    // CPW over a substrate of height h (top side air).
    const k1 = Math.sinh((Math.PI * a) / (4 * h)) / Math.sinh((Math.PI * b) / (4 * h));
    const rk1 = ellipticRatio(k1);
    epsEff = 1 + ((er - 1) / 2) * (rk1 / rk);
    z0 = ((ETA0 / 4) * (1 / rk)) / Math.sqrt(epsEff);
  } else {
    // Conductor-backed CPW: parallel combination of the CPW and the
    // microstrip-like bottom-ground path.
    const k3 = Math.tanh((Math.PI * a) / (4 * h)) / Math.tanh((Math.PI * b) / (4 * h));
    const rk3 = ellipticRatio(k3);
    epsEff = (1 + er * (rk3 / rk)) / (1 + rk3 / rk);
    z0 = ((ETA0 / 2) * (1 / (rk + rk3))) / Math.sqrt(epsEff);
  }

  return {
    z0,
    epsEff,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEff),
    conductorLossDb: NaN,
    dielectricLossDb: NaN,
    skinDepthM: skinDepth(el.frequencyHz, el.sigma, el.murC),
  };
}

/** Synthesis: adjust the gap for a target Z0 (width kept), then the length. */
export function coplanarSynthesize(
  phys: CoplanarPhysical,
  el: TranslineElectrical,
  withGround: boolean,
  z0Target: number,
  angleDeg: number,
): CoplanarPhysical | null {
  const zOf = (s: number): number => coplanarAnalyze({ ...phys, gapM: s }, el, withGround).z0;
  // Z0 grows with the gap; bracket from a sliver to very wide.
  const s = bisectSolve(zOf, z0Target, phys.widthM * 1e-4, phys.widthM * 1000);
  if (!Number.isFinite(s)) return null;
  const epsEff = coplanarAnalyze({ ...phys, gapM: s }, el, withGround).epsEff;
  return { ...phys, gapM: s, lengthM: physicalLengthM(angleDeg, el.frequencyHz, epsEff) };
}

/**
 * Rectangular waveguide (TE10 operation).
 * Counterpart: KiCad `pcb_calculator/transline/rectwaveguide.cpp`.
 */

import {
  type TranslineAnalysis,
  type TranslineElectrical,
  C0,
  ETA0,
  electricalLengthDeg,
  skinDepth,
} from './transline.js';

export interface RectWaveguidePhysical {
  /** Broad wall inner width a, m. */
  aM: number;
  /** Narrow wall inner height b, m. */
  bM: number;
  /** Guide length, m. */
  lengthM: number;
}

export interface RectWaveguideResult extends TranslineAnalysis {
  extra: {
    fcTE10Hz: number;
    fcTE20Hz: number;
    fcTE01Hz: number;
    /** Guide wavelength, m (NaN below cutoff). */
    guideWavelengthM: number;
  };
}

export function rectWaveguideAnalyze(
  phys: RectWaveguidePhysical,
  el: TranslineElectrical,
): RectWaveguideResult {
  const { aM: a, bM: b, lengthM: len } = phys;
  const er = el.epsilonR;
  const v = C0 / Math.sqrt(er);
  const fc10 = v / (2 * a);
  const fc20 = v / a;
  const fc01 = v / (2 * b);
  const f = el.frequencyHz;

  const above = f > fc10;
  const factor = above ? Math.sqrt(1 - (fc10 / f) ** 2) : NaN;
  const lambda = v / f;
  const lambdaG = above ? lambda / factor : NaN;
  // Wave impedance of TE10.
  const zte = above ? ETA0 / Math.sqrt(er) / factor : NaN;
  // Effective permittivity seen by the phase constant.
  const epsEff = above ? er * factor * factor : NaN;

  return {
    z0: zte,
    epsEff,
    angleDeg: above ? electricalLengthDeg(len, f, epsEff) : NaN,
    conductorLossDb: NaN,
    dielectricLossDb: NaN,
    skinDepthM: skinDepth(f, el.sigma, el.murC),
    extra: { fcTE10Hz: fc10, fcTE20Hz: fc20, fcTE01Hz: fc01, guideWavelengthM: lambdaG },
  };
}

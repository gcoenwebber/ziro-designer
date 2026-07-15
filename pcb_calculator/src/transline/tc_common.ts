/**
 * Shared constants and helpers for the transmission-line models, ported from
 * KiCad's `common/transline_calculations/` (units.h + transline_calculation_base).
 * These are faithful ports of the standard microwave formulas; results match
 * KiCad's calculator to the precision of the models.
 */

export const MU0 = 12.566370614e-7; // magnetic constant, H/m
export const E0 = 8.854e-12; // permittivity of free space, F/m
export const C0 = 299792458.0; // speed of light, m/s
export const ZF0 = 376.730313412; // free-space wave impedance, Ω
export const LOG2DB = 20.0 / Math.log(10); // Nepers → dB (≈ 8.68589)
export const UNIT_MICRON = 1e-6;

/** Common electrical inputs shared by every line type. */
export interface TcElectrical {
  frequencyHz: number;
  /** Substrate/dielectric relative permittivity. */
  epsilonR: number;
  /** Dielectric loss tangent. */
  tanD: number;
  /** Conductor conductivity, S/m (copper ≈ 5.8e7). */
  sigma: number;
  /** Relative permeability of the dielectric (usually 1). */
  mur: number;
  /** Relative permeability of the conductor (usually 1). */
  murC: number;
}

/** Skin depth δ = 1/√(π·f·µrc·µ0·σ). */
export function skinDepth(el: TcElectrical): number {
  return 1.0 / Math.sqrt(Math.PI * el.frequencyHz * el.murC * MU0 * el.sigma);
}

/** Surface resistance Rs = √(π·f·µrc·µ0/σ). */
export function surfaceResistance(el: TcElectrical): number {
  return Math.sqrt((Math.PI * el.frequencyHz * el.murC * MU0) / el.sigma);
}

/** Propagation delay per unit length (ps/cm) from effective permittivity. */
export function unitPropagationDelay(epsilonEff: number): number {
  return Math.sqrt(epsilonEff) * (1.0e10 / 2.99e8);
}

export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

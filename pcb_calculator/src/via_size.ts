/**
 * Plated through-hole via characteristics: resistance, IPC-2221 ampacity,
 * thermal resistance, parasitic L/C and aspect ratio.
 * Counterpart: KiCad `pcb_calculator/calculator_panels/panel_via_size.cpp`.
 */

import {
  COPPER_RESISTIVITY_OHM_M,
  COPPER_TEMP_COEFF_PER_K,
  ipc2221CurrentA,
} from './tracks_width_versus_current_formula.js';

export interface ViaSizeParams {
  /** Finished (drilled) hole diameter, m. */
  holeDiaM: number;
  /** Plating (barrel wall) thickness, m. */
  platingM: number;
  /** Via length (board thickness), m. */
  lengthM: number;
  /** Via pad diameter, m (for capacitance). */
  padDiaM: number;
  /** Clearance-hole (antipad) diameter in planes, m (for capacitance). */
  clearanceDiaM: number;
  /** Relative permittivity of the board. */
  epsilonR: number;
  /** Applied current, A. */
  currentA: number;
  /** Allowed temperature rise, °C (for ampacity). */
  deltaTC: number;
  /** Plating resistivity, Ω·m. */
  resistivity?: number;
  /** Thermal conductivity of plating, W/(m·K). */
  thermalCond?: number;
  /** Ambient temperature, °C. */
  ambientC?: number;
}

export interface ViaSizeResult {
  /** Barrel copper cross-section, m². */
  areaM2: number;
  resistanceOhm: number;
  voltageDrop: number;
  powerLossW: number;
  /** Max current for the allowed temperature rise (IPC-2221). */
  ampacityA: number;
  /** Thermal resistance end-to-end, K/W. */
  thermalResistance: number;
  /** Parasitic capacitance, F. */
  capacitanceF: number;
  /** Parasitic inductance, H. */
  inductanceH: number;
  /** Reactance at 1 GHz, Ω (indicative). */
  reactanceOhm: number;
  aspectRatio: number;
}

export function viaSize(p: ViaSizeParams): ViaSizeResult {
  const rho = p.resistivity ?? COPPER_RESISTIVITY_OHM_M;
  const kTherm = p.thermalCond ?? 401; // copper, W/(m·K)
  const rOuter = p.holeDiaM / 2 + p.platingM;
  const rInner = p.holeDiaM / 2;
  const areaM2 = Math.PI * (rOuter * rOuter - rInner * rInner);

  // Barrel resistance at the risen temperature, like the track panel.
  const tempC = (p.ambientC ?? 20) + p.deltaTC;
  const rhoHot = rho * (1 + COPPER_TEMP_COEFF_PER_K * (tempC - 20));
  const resistanceOhm = (rhoHot * p.lengthM) / areaM2;
  const voltageDrop = resistanceOhm * p.currentA;

  // Capacitance (pF): C = 1.41 · εr · T · D1 / (D2 − D1), dimensions in inch.
  const inch = 0.0254;
  const t = p.lengthM / inch;
  const d1 = p.padDiaM / inch;
  const d2 = p.clearanceDiaM / inch;
  const capacitanceF = d2 > d1 ? ((1.41 * p.epsilonR * t * d1) / (d2 - d1)) * 1e-12 : NaN;

  // Inductance (nH): L = h/5 · (1 + ln(4h/d)), h and d in mm.
  const hMm = p.lengthM * 1000;
  const dMm = p.holeDiaM * 1000;
  const inductanceH = (hMm / 5) * (1 + Math.log((4 * hMm) / dMm)) * 1e-9;

  return {
    areaM2,
    resistanceOhm,
    voltageDrop,
    powerLossW: voltageDrop * p.currentA,
    ampacityA: ipc2221CurrentA(areaM2, p.deltaTC, false),
    thermalResistance: p.lengthM / (kTherm * areaM2),
    capacitanceF,
    inductanceH,
    reactanceOhm: 2 * Math.PI * 1e9 * inductanceH,
    aspectRatio: p.lengthM / p.holeDiaM,
  };
}

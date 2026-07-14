/**
 * Galvanic-corrosion memo: anodic index of common metals/finishes and the
 * potential difference between any pair. A pair whose difference exceeds the
 * chosen threshold (default 0.3 V; harsher environments want < 0.15 V) risks
 * galvanic corrosion of the more anodic metal.
 * Counterpart: KiCad `pcb_calculator/calculator_panels/panel_galvanic_corrosion.cpp`.
 */

export interface CorrosionMetal {
  name: string;
  /** Anodic index, volts (more negative = more anodic/reactive). */
  potentialV: number;
}

export const CORROSION_METALS: readonly CorrosionMetal[] = [
  { name: 'Platinum', potentialV: 0.0 },
  { name: 'Gold', potentialV: 0.0 },
  { name: 'Rhodium', potentialV: -0.05 },
  { name: 'Graphite (carbon)', potentialV: -0.05 },
  { name: 'Silver', potentialV: -0.15 },
  { name: 'Nickel', potentialV: -0.3 },
  { name: 'Copper', potentialV: -0.35 },
  { name: 'Brass / bronze', potentialV: -0.4 },
  { name: 'Stainless steel (18-8)', potentialV: -0.5 },
  { name: 'Tin', potentialV: -0.65 },
  { name: 'Lead', potentialV: -0.7 },
  { name: 'Tin-lead solder', potentialV: -0.65 },
  { name: 'Chromium', potentialV: -0.6 },
  { name: 'Steel (mild)', potentialV: -0.85 },
  { name: 'Aluminium (wrought)', potentialV: -0.9 },
  { name: 'Cadmium', potentialV: -0.95 },
  { name: 'Aluminium (cast)', potentialV: -1.05 },
  { name: 'Galvanized steel', potentialV: -1.2 },
  { name: 'Zinc', potentialV: -1.25 },
  { name: 'Magnesium', potentialV: -1.75 },
];

/** |ΔV| between two metals of the table. */
export function corrosionDeltaV(a: number, b: number): number {
  const ma = CORROSION_METALS[a];
  const mb = CORROSION_METALS[b];
  if (!ma || !mb) return NaN;
  return Math.abs(ma.potentialV - mb.potentialV);
}

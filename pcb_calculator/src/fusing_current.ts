/**
 * Wire/track fusing (melting) current estimates: Preece and Onderdonk.
 * Counterpart: KiCad `pcb_calculator/calculator_panels/panel_fusing_current.cpp`.
 *
 * Preece (steady state):  I = a · d^1.5, d in inches, a ≈ 10244 for copper.
 * Onderdonk (short time): I = A · sqrt( log10( (Tm − Ta)/(234 + Ta) + 1 ) / (33·t) )
 * with A the cross-section in circular mils and t in seconds.
 */

export interface FusingParams {
  /** Ambient temperature, °C. */
  ambientC: number;
  /** Melting temperature, °C (copper: 1084). */
  meltingC: number;
  /** Conductor width, m (track) — or diameter when `thicknessM` is 0. */
  widthM: number;
  /** Conductor thickness, m. */
  thicknessM: number;
  /** Duration for Onderdonk, s. */
  timeS: number;
}

export interface FusingResult {
  /** Cross-section, m². */
  areaM2: number;
  /** Equivalent round-wire diameter, m. */
  equivDiaM: number;
  preeceA: number;
  onderdonkA: number;
  /** Onderdonk is only specified for short events (≲ 10 s). */
  onderdonkValid: boolean;
}

const INCH = 0.0254;

export function fusingCurrent(p: FusingParams): FusingResult {
  const areaM2 = p.thicknessM > 0 ? p.widthM * p.thicknessM : (Math.PI / 4) * p.widthM * p.widthM;
  const equivDiaM = 2 * Math.sqrt(areaM2 / Math.PI);

  const dIn = equivDiaM / INCH;
  const preeceA = 10244 * dIn ** 1.5;

  // Circular mils: (diameter in mils)².
  const cmil = (dIn * 1000) ** 2;
  const onderdonkA =
    cmil *
    Math.sqrt(Math.log10((p.meltingC - p.ambientC) / (234 + p.ambientC) + 1) / (33.5 * p.timeS));

  return {
    areaM2,
    equivDiaM,
    preeceA,
    onderdonkA,
    onderdonkValid: p.timeS <= 10,
  };
}

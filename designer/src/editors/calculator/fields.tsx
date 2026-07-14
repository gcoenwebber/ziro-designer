/**
 * Shared input/output widgets and number formatting for the calculator
 * panels (KiCad pcb_calculator's UNIT_SELECTOR + wx value fields).
 */

import type { JSX, ReactNode } from 'react';

/** Parse a user-typed number; returns NaN for empty/invalid text. */
export const parseNum = (s: string): number => {
  const t = s.trim().replace(',', '.');
  if (t === '') return NaN;
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
};

/** Format a result to a sensible precision (engineering style). */
export function fmt(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return '--';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e7 || a < 1e-4) return v.toExponential(digits - 1);
  return Number(v.toPrecision(digits)).toString();
}

/** Unit option: label + multiplier to the base SI unit. */
export interface UnitOpt {
  label: string;
  mult: number;
}

export const LEN_UNITS: UnitOpt[] = [
  { label: 'mm', mult: 1e-3 },
  { label: 'µm', mult: 1e-6 },
  { label: 'cm', mult: 1e-2 },
  { label: 'mil', mult: 25.4e-6 },
  { label: 'inch', mult: 25.4e-3 },
  { label: 'm', mult: 1 },
];

export const FREQ_UNITS: UnitOpt[] = [
  { label: 'GHz', mult: 1e9 },
  { label: 'MHz', mult: 1e6 },
  { label: 'kHz', mult: 1e3 },
  { label: 'Hz', mult: 1 },
];

export const RES_UNITS: UnitOpt[] = [
  { label: 'Ω', mult: 1 },
  { label: 'kΩ', mult: 1e3 },
  { label: 'MΩ', mult: 1e6 },
];

/** One labelled row: label, input (or output), unit text/select. */
export function Field({
  label,
  value,
  onChange,
  unit,
  readOnly,
  title,
  width,
}: {
  label: ReactNode;
  value: string;
  onChange?: (v: string) => void;
  unit?: ReactNode;
  readOnly?: boolean;
  title?: string;
  width?: number;
}): JSX.Element {
  return (
    <label className="calc-field" title={title}>
      <span className="calc-field-label">{label}</span>
      <input
        className={`calc-input${readOnly ? ' ro' : ''}`}
        style={width ? { width } : undefined}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        spellCheck={false}
      />
      {unit != null && <span className="calc-unit">{unit}</span>}
    </label>
  );
}

/** A unit dropdown bound to a UnitOpt list. */
export function UnitSelect({
  units,
  value,
  onChange,
}: {
  units: UnitOpt[];
  value: number;
  onChange: (idx: number) => void;
}): JSX.Element {
  return (
    <select
      className="calc-select calc-unit-select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {units.map((u, i) => (
        <option key={u.label} value={i}>
          {u.label}
        </option>
      ))}
    </select>
  );
}

/** KiCad-style titled group box. */
export function Group({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <fieldset className={`calc-group${className ? ` ${className}` : ''}`}>
      {title != null && <legend>{title}</legend>}
      {children}
    </fieldset>
  );
}

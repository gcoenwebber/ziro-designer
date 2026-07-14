/**
 * "Resistor Calculator" panel — approximate a required value with 1–4
 * E-series resistors. Counterpart: KiCad `calculator_panels/panel_r_calculator.cpp`.
 */

import { useMemo, useState, type JSX } from 'react';
import { ESERIES, ESeriesId, calculateResistorSubstitution } from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

export function PanelRCalculator(): JSX.Element {
  const [required, setRequired] = useState('4123');
  const [serie, setSerie] = useState<ESeriesId>(ESeriesId.E24);

  const target = parseNum(required);
  const result = useMemo(
    () => (target > 0 ? calculateResistorSubstitution(target, serie) : null),
    [target, serie],
  );

  const solutions = result
    ? [
        { label: 'Simple solution (1 resistor)', s: result.r1 },
        { label: '2 resistors', s: result.r2 },
        { label: '3 resistors', s: result.r3 },
        { label: '4 resistors', s: result.r4 },
      ]
    : [];

  return (
    <div>
      <h3>Resistor Calculator</h3>
      <div className="calc-note">
        Find combinations of standard E-series resistors (series “+” and parallel “|”) that
        approximate the required resistance.
      </div>
      <Group title="Inputs">
        <Field label="Required resistance:" value={required} onChange={setRequired} unit="Ω" />
        <div className="calc-field">
          <span className="calc-field-label">E-series:</span>
          {ESERIES.filter((e) => e.id <= ESeriesId.E24).map((e) => (
            <label key={e.id} className="calc-radio">
              <input
                type="radio"
                name="rcalc-serie"
                checked={serie === e.id}
                onChange={() => setSerie(e.id)}
              />
              {e.name}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Solutions">
        {!result && <div className="calc-error">Enter a positive resistance.</div>}
        {result && (
          <table className="calc-table">
            <thead>
              <tr>
                <th className="rowhead">Network</th>
                <th>Scheme</th>
                <th>Value</th>
                <th>Deviation</th>
              </tr>
            </thead>
            <tbody>
              {solutions.map(({ label, s }) => (
                <tr key={label}>
                  <td className="rowhead">{label}</td>
                  <td style={{ textAlign: 'left', fontFamily: 'monospace' }}>{s.formula}</td>
                  <td>{fmt(s.value, 6)} Ω</td>
                  <td>
                    {Math.abs(s.deviationPct) < 1e-9 ? 'exact' : `${fmt(s.deviationPct, 3)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Group>
    </div>
  );
}

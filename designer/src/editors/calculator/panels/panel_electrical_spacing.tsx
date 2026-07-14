/**
 * "Electrical Spacing" panel — IPC-2221 minimum clearance table with a
 * voltage lookup. Counterpart: KiCad `calculator_panels/panel_electrical_spacing_ipc2221.cpp`.
 */

import { useState, type JSX } from 'react';
import {
  IPC2221_CASES,
  IPC2221_SPACING_MM,
  IPC2221_VOLTAGE_RANGES,
  ipc2221RowForVoltage,
  ipc2221Spacing,
} from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

export function PanelElectricalSpacing(): JSX.Element {
  const [voltage, setVoltage] = useState('250');
  const v = parseNum(voltage);
  const activeRow = Number.isFinite(v) && v >= 0 ? ipc2221RowForVoltage(v) : -2;

  return (
    <div>
      <h3>Electrical Spacing (IPC-2221)</h3>
      <Group title="Voltage">
        <Field
          label="Voltage > 500 V extrapolates:"
          value={voltage}
          onChange={setVoltage}
          unit="V (DC or AC peak)"
        />
        {Number.isFinite(v) && v >= 0 && activeRow === -1 && (
          <div className="calc-note">
            Above 500 V the spacing grows linearly; the computed values are shown in the last row.
          </div>
        )}
      </Group>

      <table className="calc-table">
        <thead>
          <tr>
            <th className="rowhead">Voltage range</th>
            {IPC2221_CASES.map((c) => (
              <th key={c.id} title={c.description}>
                {c.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IPC2221_VOLTAGE_RANGES.map((label, row) => (
            <tr key={label}>
              <td className="rowhead">{label}</td>
              {(IPC2221_SPACING_MM[row] ?? []).map((mm, col) => (
                <td key={IPC2221_CASES[col]?.id ?? col} className={row === activeRow ? 'hl' : ''}>
                  {mm}
                </td>
              ))}
            </tr>
          ))}
          {activeRow === -1 && (
            <tr>
              <td className="rowhead">{fmt(v)} V (computed)</td>
              {IPC2221_CASES.map((c, col) => (
                <td key={c.id} className="hl">
                  {fmt(ipc2221Spacing(v, col), 4)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      <div className="calc-note">All values in millimetres.</div>

      <Group title="Cases">
        <table className="calc-table">
          <tbody>
            {IPC2221_CASES.map((c) => (
              <tr key={c.id}>
                <td className="rowhead">{c.id}</td>
                <td className="rowhead">{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Group>
    </div>
  );
}

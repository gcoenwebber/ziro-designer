/**
 * "E-Series" memo panel — the IEC 60063 preferred-value tables.
 * Counterpart: KiCad `calculator_panels/panel_eseries_display.cpp`.
 */

import type { JSX } from 'react';
import { E12_VALUES, E24_VALUES, E48_VALUES, E96_VALUES } from '@ziroeda/pcb_calculator';

/** E24 column table with membership marks for the coarser series. */
function SmallSeriesTable(): JSX.Element {
  const inE1 = new Set([1.0]);
  const inE3 = new Set([1.0, 2.2, 4.7]);
  const inE6 = new Set([1.0, 1.5, 2.2, 3.3, 4.7, 6.8]);
  const inE12 = new Set(E12_VALUES);
  return (
    <table className="calc-table">
      <thead>
        <tr>
          <th>E24</th>
          <th>E12</th>
          <th>E6</th>
          <th>E3</th>
          <th>E1</th>
        </tr>
      </thead>
      <tbody>
        {E24_VALUES.map((v) => (
          <tr key={v}>
            <td>{v.toFixed(1)}</td>
            <td>{inE12.has(v) ? v.toFixed(1) : ''}</td>
            <td>{inE6.has(v) ? v.toFixed(1) : ''}</td>
            <td>{inE3.has(v) ? v.toFixed(1) : ''}</td>
            <td>{inE1.has(v) ? v.toFixed(1) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** E48/E96 laid out in compact columns. */
function LargeSeriesTable({
  values,
  cols,
  title,
}: {
  values: readonly number[];
  cols: number;
  title: string;
}): JSX.Element {
  const rows = Math.ceil(values.length / cols);
  return (
    <div>
      <h4 style={{ margin: '6px 0' }}>{title}</h4>
      <table className="calc-table">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => {
                const v = values[c * rows + r];
                return <td key={`${r}-${c}`}>{v != null ? v.toFixed(2) : ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelEseriesDisplay(): JSX.Element {
  return (
    <div>
      <h3>E-Series (IEC 60063 preferred values)</h3>
      <div className="calc-note">
        Base values of the first decade (1 … 10). Series tolerance pairing: E6 ±20 %, E12 ±10 %, E24
        ±5 %, E48 ±2 %, E96 ±1 %.
      </div>
      <div className="calc-row">
        <SmallSeriesTable />
        <LargeSeriesTable values={E48_VALUES} cols={4} title="E48 (±2 %)" />
        <LargeSeriesTable values={E96_VALUES} cols={6} title="E96 (±1 %)" />
      </div>
    </div>
  );
}

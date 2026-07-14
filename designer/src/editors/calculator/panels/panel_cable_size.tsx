/**
 * "Cable Size" panel — AWG/diameter linked fields, ampacity by current
 * density and application results. Counterpart: KiCad `calculator_panels/panel_cable_size.cpp`.
 */

import { useMemo, useState, type JSX } from 'react';
import {
  AWG_NAMES,
  awgDiameterM,
  awgIndexToGauge,
  cableSize,
  nearestAwgIndex,
} from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

export function PanelCableSize(): JSX.Element {
  const [awgIdx, setAwgIdx] = useState(27); // AWG 24
  const [diameter, setDiameter] = useState(() => fmt(awgDiameterM(24) * 1000));
  const [temp, setTemp] = useState('20');
  const [density, setDensity] = useState('3');
  const [current, setCurrent] = useState('1');
  const [length, setLength] = useState('1');

  const pickAwg = (idx: number): void => {
    setAwgIdx(idx);
    setDiameter(fmt(awgDiameterM(awgIndexToGauge(idx)) * 1000));
  };
  const typeDiameter = (v: string): void => {
    setDiameter(v);
    const d = parseNum(v) * 1e-3;
    if (d > 0) setAwgIdx(nearestAwgIndex(d));
  };

  const r = useMemo(() => {
    const p = {
      diameterM: parseNum(diameter) * 1e-3,
      conductorTempC: parseNum(temp),
      currentDensity: parseNum(density),
      currentA: parseNum(current),
      lengthM: parseNum(length),
    };
    if (!(p.diameterM > 0) || !(p.currentDensity > 0)) return null;
    return cableSize(p);
  }, [diameter, temp, density, current, length]);

  return (
    <div>
      <h3>Cable Size</h3>
      <div className="calc-row">
        <Group title="Wire properties">
          <div className="calc-field">
            <span className="calc-field-label">Standard size:</span>
            <select
              className="calc-select"
              value={awgIdx}
              onChange={(e) => pickAwg(Number(e.target.value))}
            >
              {AWG_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Field label="Diameter:" value={diameter} onChange={typeDiameter} unit="mm" />
          <Field
            label="Cross-section area:"
            value={r ? fmt(r.areaMm2) : '--'}
            readOnly
            unit="mm²"
          />
          <Field
            label="Resistance per meter (20 °C):"
            value={r ? fmt(r.resPerMeter20 * 1000) : '--'}
            readOnly
            unit="mΩ/m"
          />
          <Field label="Conductor temperature:" value={temp} onChange={setTemp} unit="°C" />
          <Field
            label="Resistance per meter (hot):"
            value={r ? fmt(r.resPerMeter * 1000) : '--'}
            readOnly
            unit="mΩ/m"
          />
          <Field label="Max current density:" value={density} onChange={setDensity} unit="A/mm²" />
          <Field
            label="Ampacity (by density):"
            value={r ? fmt(r.ampacityA) : '--'}
            readOnly
            unit="A"
          />
        </Group>
        <Group title="Application">
          <Field label="Current:" value={current} onChange={setCurrent} unit="A" />
          <Field label="Length:" value={length} onChange={setLength} unit="m" />
          <Field label="Resistance:" value={r ? fmt(r.resistanceOhm) : '--'} readOnly unit="Ω" />
          <Field label="Voltage drop:" value={r ? fmt(r.voltageDrop) : '--'} readOnly unit="V" />
          <Field label="Dissipated power:" value={r ? fmt(r.powerLossW) : '--'} readOnly unit="W" />
          {r && parseNum(current) > r.ampacityA && (
            <div className="calc-error">Current exceeds the ampacity for this density.</div>
          )}
        </Group>
      </div>
      {!r && <div className="calc-error">Enter a positive diameter and current density.</div>}
    </div>
  );
}

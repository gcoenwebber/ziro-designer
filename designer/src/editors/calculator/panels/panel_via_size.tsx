/**
 * "Via Size" panel — electrical, thermal and parasitic characteristics of a
 * plated through-hole via. Counterpart: KiCad `calculator_panels/panel_via_size.cpp`.
 */

import { useMemo, useState, type JSX } from 'react';
import { viaSize } from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

export function PanelViaSize(): JSX.Element {
  const [hole, setHole] = useState('0.4');
  const [plating, setPlating] = useState('0.035');
  const [length, setLength] = useState('1.6');
  const [pad, setPad] = useState('0.6');
  const [clearance, setClearance] = useState('1.0');
  const [er, setEr] = useState('4.5');
  const [current, setCurrent] = useState('1');
  const [deltaT, setDeltaT] = useState('10');

  const r = useMemo(() => {
    const p = {
      holeDiaM: parseNum(hole) * 1e-3,
      platingM: parseNum(plating) * 1e-3,
      lengthM: parseNum(length) * 1e-3,
      padDiaM: parseNum(pad) * 1e-3,
      clearanceDiaM: parseNum(clearance) * 1e-3,
      epsilonR: parseNum(er),
      currentA: parseNum(current),
      deltaTC: parseNum(deltaT),
    };
    if (!(p.holeDiaM > 0) || !(p.platingM > 0) || !(p.lengthM > 0) || !(p.deltaTC > 0)) return null;
    return viaSize(p);
  }, [hole, plating, length, pad, clearance, er, current, deltaT]);

  return (
    <div>
      <h3>Via Size</h3>
      <div className="calc-row">
        <Group title="Parameters">
          <Field label="Finished hole diameter:" value={hole} onChange={setHole} unit="mm" />
          <Field label="Plating thickness:" value={plating} onChange={setPlating} unit="mm" />
          <Field
            label="Via length (board thickness):"
            value={length}
            onChange={setLength}
            unit="mm"
          />
          <Field label="Via pad diameter:" value={pad} onChange={setPad} unit="mm" />
          <Field
            label="Clearance hole diameter:"
            value={clearance}
            onChange={setClearance}
            unit="mm"
          />
          <Field label="Board permittivity (εr):" value={er} onChange={setEr} unit="" />
          <Field label="Applied current:" value={current} onChange={setCurrent} unit="A" />
          <Field label="Temperature rise:" value={deltaT} onChange={setDeltaT} unit="°C" />
        </Group>
        <Group title="Results">
          <Field
            label="Resistance:"
            value={r ? fmt(r.resistanceOhm * 1000) : '--'}
            readOnly
            unit="mΩ"
          />
          <Field
            label="Voltage drop:"
            value={r ? fmt(r.voltageDrop * 1000) : '--'}
            readOnly
            unit="mV"
          />
          <Field
            label="Power loss:"
            value={r ? fmt(r.powerLossW * 1000) : '--'}
            readOnly
            unit="mW"
          />
          <Field
            label="Estimated ampacity (IPC-2221):"
            value={r ? fmt(r.ampacityA) : '--'}
            readOnly
            unit="A"
          />
          <Field
            label="Thermal resistance:"
            value={r ? fmt(r.thermalResistance) : '--'}
            readOnly
            unit="K/W"
          />
          <Field
            label="Capacitance:"
            value={r ? fmt(r.capacitanceF * 1e12) : '--'}
            readOnly
            unit="pF"
          />
          <Field
            label="Inductance:"
            value={r ? fmt(r.inductanceH * 1e9) : '--'}
            readOnly
            unit="nH"
          />
          <Field
            label="Reactance @ 1 GHz:"
            value={r ? fmt(r.reactanceOhm) : '--'}
            readOnly
            unit="Ω"
          />
          <Field
            label="Aspect ratio:"
            value={r ? fmt(r.aspectRatio, 3) : '--'}
            readOnly
            unit=":1"
          />
          {r && r.aspectRatio > 8 && (
            <div className="calc-error">
              Aspect ratio over 8:1 — many fabs cannot plate this via.
            </div>
          )}
        </Group>
      </div>
      {!r && <div className="calc-error">Enter positive hole, plating, length and ΔT values.</div>}
    </div>
  );
}

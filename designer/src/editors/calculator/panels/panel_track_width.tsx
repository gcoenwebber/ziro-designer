/**
 * "Track Width" panel — IPC-2221 current capacity for external and internal
 * layers. Counterpart: KiCad `calculator_panels/panel_track_width.cpp`.
 */

import { useMemo, useState, type JSX } from 'react';
import { trackWidth } from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

const OZ_TO_M = 35e-6; // 1 oz/ft² copper ≈ 35 µm

export function PanelTrackWidth(): JSX.Element {
  const [current, setCurrent] = useState('1');
  const [deltaT, setDeltaT] = useState('10');
  const [length, setLength] = useState('20'); // cm
  const [thicknessOz, setThicknessOz] = useState('1'); // oz/ft²

  const params = useMemo(
    () => ({
      currentA: parseNum(current),
      deltaTC: parseNum(deltaT),
      lengthM: parseNum(length) / 100,
      thicknessM: parseNum(thicknessOz) * OZ_TO_M,
    }),
    [current, deltaT, length, thicknessOz],
  );
  const valid =
    params.currentA > 0 && params.deltaTC > 0 && params.lengthM >= 0 && params.thicknessM > 0;
  const ext = valid ? trackWidth(params, true) : null;
  const int_ = valid ? trackWidth(params, false) : null;

  const results = (r: ReturnType<typeof trackWidth> | null): JSX.Element => (
    <>
      <Field
        label="Required track width:"
        value={r ? fmt(r.widthM * 1000) : '--'}
        readOnly
        unit="mm"
      />
      <Field
        label="Cross-section area:"
        value={r ? fmt(r.areaM2 * 1e6) : '--'}
        readOnly
        unit="mm²"
      />
      <Field label="Resistance:" value={r ? fmt(r.resistanceOhm) : '--'} readOnly unit="Ω" />
      <Field label="Voltage drop:" value={r ? fmt(r.voltageDrop) : '--'} readOnly unit="V" />
      <Field label="Power loss:" value={r ? fmt(r.powerLossW) : '--'} readOnly unit="W" />
    </>
  );

  return (
    <div>
      <h3>Track Width (IPC-2221)</h3>
      <div className="calc-formula">
        I = K · ΔT^0.44 · (W·H)^0.725 — K = 0.048 external, 0.024 internal
      </div>
      <div className="calc-note">
        The IPC-2221 nomograph-based estimate; valid for currents up to ~35 A, temperature rise up
        to 100 °C and copper up to 3 oz/ft².
      </div>
      <Group title="Parameters">
        <Field label="Current:" value={current} onChange={setCurrent} unit="A" />
        <Field label="Temperature rise:" value={deltaT} onChange={setDeltaT} unit="°C" />
        <Field label="Conductor length:" value={length} onChange={setLength} unit="cm" />
        <Field
          label="Copper thickness:"
          value={thicknessOz}
          onChange={setThicknessOz}
          unit="oz/ft²"
        />
      </Group>
      {!valid && <div className="calc-error">Enter positive values.</div>}
      <div className="calc-row">
        <Group title="External layer traces">{results(ext)}</Group>
        <Group title="Internal layer traces">{results(int_)}</Group>
      </div>
    </div>
  );
}

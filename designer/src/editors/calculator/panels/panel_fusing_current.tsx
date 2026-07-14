/**
 * "Fusing Current" panel — Preece / Onderdonk melting-current estimates.
 * Counterpart: KiCad `calculator_panels/panel_fusing_current.cpp`.
 */

import { useMemo, useState, type JSX } from 'react';
import { fusingCurrent } from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

export function PanelFusingCurrent(): JSX.Element {
  const [ambient, setAmbient] = useState('25');
  const [melting, setMelting] = useState('1084');
  const [width, setWidth] = useState('0.5');
  const [thickness, setThickness] = useState('0.035');
  const [time, setTime] = useState('1');
  const [round, setRound] = useState(false);

  const r = useMemo(() => {
    const p = {
      ambientC: parseNum(ambient),
      meltingC: parseNum(melting),
      widthM: parseNum(width) * 1e-3,
      thicknessM: round ? 0 : parseNum(thickness) * 1e-3,
      timeS: parseNum(time),
    };
    if (!(p.widthM > 0) || !(p.timeS > 0) || !(p.meltingC > p.ambientC)) return null;
    if (!round && !(p.thicknessM > 0)) return null;
    return fusingCurrent(p);
  }, [ambient, melting, width, thickness, time, round]);

  return (
    <div>
      <h3>Fusing Current</h3>
      <div className="calc-note">
        Estimates the current that melts a copper conductor — Preece for steady state, Onderdonk for
        a short event. These are estimates; treat them with a healthy safety margin.
      </div>
      <Group title="Parameters">
        <Field label="Ambient temperature:" value={ambient} onChange={setAmbient} unit="°C" />
        <Field label="Melting point:" value={melting} onChange={setMelting} unit="°C" />
        <div className="calc-field">
          <span className="calc-field-label">Conductor shape:</span>
          <label className="calc-radio">
            <input
              type="radio"
              name="fuse-shape"
              checked={!round}
              onChange={() => setRound(false)}
            />
            Rectangular (track)
          </label>
          <label className="calc-radio">
            <input type="radio" name="fuse-shape" checked={round} onChange={() => setRound(true)} />
            Round wire
          </label>
        </div>
        <Field label={round ? 'Diameter:' : 'Width:'} value={width} onChange={setWidth} unit="mm" />
        {!round && <Field label="Thickness:" value={thickness} onChange={setThickness} unit="mm" />}
        <Field label="Duration (Onderdonk):" value={time} onChange={setTime} unit="s" />
      </Group>
      <Group title="Results">
        <Field
          label="Cross-section area:"
          value={r ? fmt(r.areaM2 * 1e6) : '--'}
          readOnly
          unit="mm²"
        />
        <Field
          label="Equivalent wire diameter:"
          value={r ? fmt(r.equivDiaM * 1000) : '--'}
          readOnly
          unit="mm"
        />
        <Field label="Preece fusing current:" value={r ? fmt(r.preeceA) : '--'} readOnly unit="A" />
        <Field
          label="Onderdonk fusing current:"
          value={r ? fmt(r.onderdonkA) : '--'}
          readOnly
          unit="A"
        />
        {r && !r.onderdonkValid && (
          <div className="calc-error">
            Onderdonk is only valid for events of about 10 s or less.
          </div>
        )}
      </Group>
      {!r && (
        <div className="calc-error">Check the inputs (positive sizes, melting above ambient).</div>
      )}
    </div>
  );
}

/**
 * "Transmission Lines" panel — analysis/synthesis for the eight line types.
 * Counterpart: KiCad `calculator_panels/panel_transline.cpp`.
 */

import { useState, type JSX } from 'react';
import {
  coaxAnalyze,
  coaxSynthesize,
  coplanarAnalyze,
  coplanarSynthesize,
  coupledMicrostripAnalyze,
  coupledMicrostripSynthesize,
  microstripAnalyze,
  microstripSynthesize,
  rectWaveguideAnalyze,
  striplineAnalyze,
  striplineSynthesize,
  twistedPairAnalyze,
  twistedPairSynthesize,
  type TranslineAnalysis,
} from '@ziroeda/pcb_calculator';
import { Field, Group, fmt, parseNum } from '../fields.js';

type LineType =
  | 'microstrip'
  | 'cpw'
  | 'gcpw'
  | 'rectwaveguide'
  | 'coax'
  | 'c_microstrip'
  | 'stripline'
  | 'twistedpair';

const LINE_TYPES: { id: LineType; name: string }[] = [
  { id: 'microstrip', name: 'Microstrip Line' },
  { id: 'cpw', name: 'Coplanar Waveguide' },
  { id: 'gcpw', name: 'Coplanar Waveguide with Ground Plane' },
  { id: 'rectwaveguide', name: 'Rectangular Waveguide' },
  { id: 'coax', name: 'Coaxial Line' },
  { id: 'c_microstrip', name: 'Coupled Microstrip Lines' },
  { id: 'stripline', name: 'Stripline' },
  { id: 'twistedpair', name: 'Twisted Pair' },
];

/** Physical fields per line type; values are strings in mm (or turns/m). */
const PHYS_FIELDS: Record<LineType, { key: string; label: string; unit: string; def: string }[]> = {
  microstrip: [
    { key: 'w', label: 'Trace width (W):', unit: 'mm', def: '3' },
    { key: 'h', label: 'Substrate height (H):', unit: 'mm', def: '1.6' },
    { key: 't', label: 'Trace thickness (T):', unit: 'mm', def: '0.035' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '50' },
  ],
  cpw: [
    { key: 'w', label: 'Trace width (W):', unit: 'mm', def: '0.5' },
    { key: 's', label: 'Gap width (S):', unit: 'mm', def: '0.3' },
    { key: 'h', label: 'Substrate height (H):', unit: 'mm', def: '1.6' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '50' },
  ],
  gcpw: [
    { key: 'w', label: 'Trace width (W):', unit: 'mm', def: '0.5' },
    { key: 's', label: 'Gap width (S):', unit: 'mm', def: '0.3' },
    { key: 'h', label: 'Substrate height (H):', unit: 'mm', def: '1.6' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '50' },
  ],
  rectwaveguide: [
    { key: 'a', label: 'Broad wall width (a):', unit: 'mm', def: '22.86' },
    { key: 'b', label: 'Narrow wall height (b):', unit: 'mm', def: '10.16' },
    { key: 'l', label: 'Guide length (L):', unit: 'mm', def: '100' },
  ],
  coax: [
    { key: 'din', label: 'Inner conductor diameter (d):', unit: 'mm', def: '0.9' },
    { key: 'dout', label: 'Shield diameter (D):', unit: 'mm', def: '2.95' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '1000' },
  ],
  c_microstrip: [
    { key: 'w', label: 'Trace width (W):', unit: 'mm', def: '0.3' },
    { key: 's', label: 'Gap width (S):', unit: 'mm', def: '0.2' },
    { key: 'h', label: 'Substrate height (H):', unit: 'mm', def: '0.2' },
    { key: 't', label: 'Trace thickness (T):', unit: 'mm', def: '0.035' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '50' },
  ],
  stripline: [
    { key: 'w', label: 'Strip width (W):', unit: 'mm', def: '0.7' },
    { key: 'h', label: 'Ground spacing (B):', unit: 'mm', def: '1.6' },
    { key: 't', label: 'Strip thickness (T):', unit: 'mm', def: '0.035' },
    { key: 'l', label: 'Line length (L):', unit: 'mm', def: '50' },
  ],
  twistedpair: [
    { key: 'din', label: 'Conductor diameter (d):', unit: 'mm', def: '0.511' },
    { key: 'dout', label: 'Insulation diameter (D):', unit: 'mm', def: '0.93' },
    { key: 'twists', label: 'Twists per meter:', unit: '1/m', def: '100' },
    { key: 'l', label: 'Cable length (L):', unit: 'mm', def: '1000' },
  ],
};

const SUBSTRATE_DEFAULTS = {
  er: '4.5',
  tand: '0.02',
  sigma: '5.8e7',
  mur: '1',
  erEnv: '1',
};

export function PanelTransline(): JSX.Element {
  const [type, setType] = useState<LineType>('microstrip');
  const [freq, setFreq] = useState('1'); // GHz
  const [sub, setSub] = useState({ ...SUBSTRATE_DEFAULTS });
  const [phys, setPhys] = useState<Record<string, string>>(() => defaults('microstrip'));
  const [z0, setZ0] = useState('50');
  const [angle, setAngle] = useState('90');
  const [result, setResult] = useState<TranslineAnalysis | null>(null);
  const [error, setError] = useState('');

  function defaults(t: LineType): Record<string, string> {
    return Object.fromEntries(PHYS_FIELDS[t].map((f) => [f.key, f.def]));
  }

  const pick = (t: LineType): void => {
    setType(t);
    setPhys(defaults(t));
    setResult(null);
    setError('');
    setZ0(t === 'c_microstrip' ? '100' : t === 'twistedpair' ? '120' : '50');
  };

  const el = () => ({
    frequencyHz: parseNum(freq) * 1e9,
    epsilonR: parseNum(sub.er),
    tanD: parseNum(sub.tand),
    sigma: parseNum(sub.sigma),
    murC: parseNum(sub.mur),
  });
  const mm = (key: string): number => parseNum(phys[key] ?? '') * 1e-3;
  const twists = (): number => parseNum(phys.twists ?? '');

  const analyze = (): void => {
    setError('');
    try {
      const e = el();
      let r: TranslineAnalysis;
      switch (type) {
        case 'microstrip':
          r = microstripAnalyze(
            { widthM: mm('w'), heightM: mm('h'), thicknessM: mm('t'), lengthM: mm('l') },
            e,
          );
          break;
        case 'cpw':
        case 'gcpw':
          r = coplanarAnalyze(
            { widthM: mm('w'), gapM: mm('s'), heightM: mm('h'), lengthM: mm('l') },
            e,
            type === 'gcpw',
          );
          break;
        case 'rectwaveguide':
          r = rectWaveguideAnalyze({ aM: mm('a'), bM: mm('b'), lengthM: mm('l') }, e);
          break;
        case 'coax':
          r = coaxAnalyze({ innerDiaM: mm('din'), outerDiaM: mm('dout'), lengthM: mm('l') }, e);
          break;
        case 'c_microstrip':
          r = coupledMicrostripAnalyze(
            {
              widthM: mm('w'),
              gapM: mm('s'),
              heightM: mm('h'),
              thicknessM: mm('t'),
              lengthM: mm('l'),
            },
            e,
          );
          break;
        case 'stripline':
          r = striplineAnalyze(
            { widthM: mm('w'), heightM: mm('h'), thicknessM: mm('t'), lengthM: mm('l') },
            e,
          );
          break;
        case 'twistedpair':
          r = twistedPairAnalyze(
            { dinM: mm('din'), doutM: mm('dout'), twistsPerM: twists(), lengthM: mm('l') },
            { ...e, epsilonRenv: parseNum(sub.erEnv) },
          );
          break;
      }
      setResult(r);
      setZ0(fmt(type === 'c_microstrip' ? (r.extra?.zDiff ?? r.z0) : r.z0, 5));
      setAngle(fmt(r.angleDeg, 5));
    } catch {
      setError('Analysis failed — check the input values.');
    }
  };

  const synthesize = (): void => {
    setError('');
    const e = el();
    const zTarget = parseNum(z0);
    const angTarget = parseNum(angle);
    if (!(zTarget > 0) || !(angTarget > 0)) {
      setError('Enter a positive Z0 and electrical length.');
      return;
    }
    let next: Record<string, string> | null = null;
    switch (type) {
      case 'microstrip': {
        const s = microstripSynthesize(
          { widthM: mm('w'), heightM: mm('h'), thicknessM: mm('t'), lengthM: mm('l') },
          e,
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, w: fmt(s.widthM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
      case 'cpw':
      case 'gcpw': {
        const s = coplanarSynthesize(
          { widthM: mm('w'), gapM: mm('s'), heightM: mm('h'), lengthM: mm('l') },
          e,
          type === 'gcpw',
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, s: fmt(s.gapM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
      case 'rectwaveguide':
        setError('Synthesis is not available for rectangular waveguides.');
        return;
      case 'coax': {
        const s = coaxSynthesize(
          { innerDiaM: mm('din'), outerDiaM: mm('dout'), lengthM: mm('l') },
          e,
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, din: fmt(s.innerDiaM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
      case 'c_microstrip': {
        const s = coupledMicrostripSynthesize(
          {
            widthM: mm('w'),
            gapM: mm('s'),
            heightM: mm('h'),
            thicknessM: mm('t'),
            lengthM: mm('l'),
          },
          e,
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, s: fmt(s.gapM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
      case 'stripline': {
        const s = striplineSynthesize(
          { widthM: mm('w'), heightM: mm('h'), thicknessM: mm('t'), lengthM: mm('l') },
          e,
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, w: fmt(s.widthM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
      case 'twistedpair': {
        const s = twistedPairSynthesize(
          { dinM: mm('din'), doutM: mm('dout'), twistsPerM: twists(), lengthM: mm('l') },
          { ...e, epsilonRenv: parseNum(sub.erEnv) },
          zTarget,
          angTarget,
        );
        if (s) next = { ...phys, din: fmt(s.dinM * 1000, 5), l: fmt(s.lengthM * 1000, 5) };
        break;
      }
    }
    if (!next) {
      setError('No physical solution found for this target impedance.');
      return;
    }
    setPhys(next);
    setResult(null);
  };

  const isDiff = type === 'c_microstrip';
  const extraRows: [string, string][] = [];
  if (result?.extra) {
    const x = result.extra;
    if (x.z0Even != null) extraRows.push(['Even-mode impedance (Ze)', `${fmt(x.z0Even, 5)} Ω`]);
    if (x.z0Odd != null) extraRows.push(['Odd-mode impedance (Zo)', `${fmt(x.z0Odd, 5)} Ω`]);
    if (x.zDiff != null) extraRows.push(['Differential impedance (Zd)', `${fmt(x.zDiff, 5)} Ω`]);
    if (x.zComm != null) extraRows.push(['Common-mode impedance (Zc)', `${fmt(x.zComm, 5)} Ω`]);
    if (x.coupling != null) extraRows.push(['Coupling factor', fmt(x.coupling, 4)]);
    if (x.te11CutoffHz != null)
      extraRows.push(['TE11 cutoff', `${fmt(x.te11CutoffHz / 1e9, 4)} GHz`]);
    if (x.fcTE10Hz != null) extraRows.push(['TE10 cutoff', `${fmt(x.fcTE10Hz / 1e9, 4)} GHz`]);
    if (x.fcTE20Hz != null) extraRows.push(['TE20 cutoff', `${fmt(x.fcTE20Hz / 1e9, 4)} GHz`]);
    if (x.fcTE01Hz != null) extraRows.push(['TE01 cutoff', `${fmt(x.fcTE01Hz / 1e9, 4)} GHz`]);
    if (x.guideWavelengthM != null)
      extraRows.push(['Guide wavelength', `${fmt(x.guideWavelengthM * 1000, 5)} mm`]);
  }

  return (
    <div>
      <h3>Transmission Lines</h3>
      <div className="calc-field">
        <span className="calc-field-label">Line type:</span>
        <select
          className="calc-select"
          value={type}
          onChange={(e) => pick(e.target.value as LineType)}
        >
          {LINE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="calc-row">
        <Group title="Substrate parameters">
          <Field
            label="Relative permittivity (εr):"
            value={sub.er}
            onChange={(v) => setSub({ ...sub, er: v })}
            unit=""
          />
          <Field
            label="Loss tangent (tanδ):"
            value={sub.tand}
            onChange={(v) => setSub({ ...sub, tand: v })}
            unit=""
          />
          <Field
            label="Conductivity (σ):"
            value={sub.sigma}
            onChange={(v) => setSub({ ...sub, sigma: v })}
            unit="S/m"
          />
          <Field
            label="Conductor permeability (µ):"
            value={sub.mur}
            onChange={(v) => setSub({ ...sub, mur: v })}
            unit=""
          />
          {type === 'twistedpair' && (
            <Field
              label="Environment εr:"
              value={sub.erEnv}
              onChange={(v) => setSub({ ...sub, erEnv: v })}
              unit=""
            />
          )}
          <Field label="Frequency:" value={freq} onChange={setFreq} unit="GHz" />
        </Group>

        <Group title="Physical parameters">
          {PHYS_FIELDS[type].map((f) => (
            <Field
              key={f.key}
              label={f.label}
              value={phys[f.key] ?? ''}
              onChange={(v) => setPhys({ ...phys, [f.key]: v })}
              unit={f.unit}
            />
          ))}
        </Group>

        <Group title="Electrical parameters">
          <Field
            label={isDiff ? 'Differential impedance (Zd):' : 'Characteristic impedance (Z0):'}
            value={z0}
            onChange={setZ0}
            unit="Ω"
          />
          <Field label="Electrical length:" value={angle} onChange={setAngle} unit="°" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="calc-btn primary" onClick={analyze}>
              Analyze ▶
            </button>
            <button type="button" className="calc-btn primary" onClick={synthesize}>
              ◀ Synthesize
            </button>
          </div>
        </Group>
      </div>

      {error && <div className="calc-error">{error}</div>}

      <Group title="Results">
        <table className="calc-table">
          <tbody>
            <tr>
              <td className="rowhead">Characteristic impedance (Z0)</td>
              <td>{result ? `${fmt(result.z0, 5)} Ω` : '--'}</td>
            </tr>
            <tr>
              <td className="rowhead">Effective permittivity (εeff)</td>
              <td>{result ? fmt(result.epsEff, 5) : '--'}</td>
            </tr>
            <tr>
              <td className="rowhead">Electrical length</td>
              <td>{result ? `${fmt(result.angleDeg, 5)} °` : '--'}</td>
            </tr>
            <tr>
              <td className="rowhead">Conductor losses</td>
              <td>
                {result && Number.isFinite(result.conductorLossDb)
                  ? `${fmt(result.conductorLossDb, 4)} dB`
                  : '--'}
              </td>
            </tr>
            <tr>
              <td className="rowhead">Dielectric losses</td>
              <td>
                {result && Number.isFinite(result.dielectricLossDb)
                  ? `${fmt(result.dielectricLossDb, 4)} dB`
                  : '--'}
              </td>
            </tr>
            <tr>
              <td className="rowhead">Skin depth</td>
              <td>{result ? `${fmt(result.skinDepthM * 1e6, 4)} µm` : '--'}</td>
            </tr>
            {extraRows.map(([k, v]) => (
              <tr key={k}>
                <td className="rowhead">{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Group>
    </div>
  );
}

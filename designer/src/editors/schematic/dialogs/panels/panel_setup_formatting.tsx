/**
 * Schematic Setup > Formatting. Counterpart:
 * `eeschema/dialogs/panel_setup_formatting.cpp` (PANEL_SETUP_FORMATTING) — the
 * SCHEMATIC_SETTINGS formatting fields grouped exactly as upstream: Text,
 * Symbols, Connections, Inter-sheet References, and Dashed Lines. The
 * Operating-point Overlay group is simulation-only and omitted.
 *
 * These are project-scoped defaults (SCHEMATIC_SETTINGS): default text/line
 * sizes for newly placed items, junction dot size, dashed-line ratios, and the
 * inter-sheet reference presentation.
 */

import type { JSX } from 'react';

/** The junction-dot / hop-over size choices (JUNCTION_DOT_SIZES in schematic_settings). */
export const JUNCTION_DOT_SIZES = ['None', 'Smallest', 'Small', 'Default', 'Large', 'Largest'];

/** SCHEMATIC_SETTINGS formatting subset edited by the panel. */
export interface FormattingSettings {
  /** Default text size (mils) for new text/labels (m_DefaultTextSize). */
  defaultTextSizeMils: number;
  /** Overbar vertical offset as a % of text size (m_OverbarHeight-ish). */
  overbarOffsetRatio: number;
  /** Label offset above a wire/pin as a % of text size (m_TextOffsetRatio). */
  labelOffsetRatio: number;
  /** Global-label box margin as a % of text size (m_LabelSizeRatio). */
  labelSizeRatio: number;
  /** Default graphic line width (mils) for new items (m_DefaultLineWidth). */
  defaultLineWidthMils: number;
  /** Pin symbol size (mils) for decorations like clocks (m_PinSymbolSize). */
  pinSymbolSizeMils: number;
  /** Junction dot size choice index (m_JunctionSizeChoice). */
  junctionDotChoice: number;
  /** Show inter-sheet references (m_IntersheetRefsShow). */
  intersheetRefsShow: boolean;
  /** Show own page in the reference list (m_IntersheetRefsListOwnPage). */
  intersheetRefsOwnPage: boolean;
  /** Abbreviated (1..3) vs standard (1,2,3) format (m_IntersheetRefsFormatShort). */
  intersheetRefsAbbreviated: boolean;
  /** Reference list prefix / suffix (m_IntersheetRefsPrefix / Suffix). */
  intersheetRefsPrefix: string;
  intersheetRefsSuffix: string;
  /** Dashed-line dash / gap lengths as ratios of the line width. */
  dashLengthRatio: number;
  gapLengthRatio: number;
}

/** SCHEMATIC_SETTINGS defaults (schematic_settings.cpp). */
export function defaultFormatting(): FormattingSettings {
  return {
    defaultTextSizeMils: 50,
    overbarOffsetRatio: 1.23,
    labelOffsetRatio: 15,
    labelSizeRatio: 37.5,
    defaultLineWidthMils: 6,
    pinSymbolSizeMils: 25,
    junctionDotChoice: 3, // "Default"
    intersheetRefsShow: false,
    intersheetRefsOwnPage: true,
    intersheetRefsAbbreviated: false,
    intersheetRefsPrefix: '',
    intersheetRefsSuffix: '',
    dashLengthRatio: 12,
    gapLengthRatio: 3,
  };
}

interface Props {
  value: FormattingSettings;
  onChange: (next: FormattingSettings) => void;
}

const box: React.CSSProperties = {
  border: '1px solid var(--chrome-border)',
  borderRadius: 4,
  padding: '4px 10px 8px',
  margin: '0 0 12px',
};
const legend: React.CSSProperties = { fontSize: 11.5, padding: '0 4px', fontWeight: 600 };
const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '5px 0',
  fontSize: 12.5,
};
const lab: React.CSSProperties = { width: 168, flex: '0 0 auto', fontSize: 12 };
const num: React.CSSProperties = { width: 76 };

export function PanelSetupFormatting({ value, onChange }: Props): JSX.Element {
  const set = <K extends keyof FormattingSettings>(k: K, v: FormattingSettings[K]): void =>
    onChange({ ...value, [k]: v });
  const numField = (
    label: string,
    key: keyof FormattingSettings,
    unit: string,
    tip?: string,
  ): JSX.Element => (
    <div style={row} title={tip}>
      <span style={lab}>{label}</span>
      <input
        className="ze-search"
        type="number"
        style={num}
        value={value[key] as number}
        onChange={(e) => set(key, Number(e.target.value) as never)}
      />
      <span className="ze-muted" style={{ fontSize: 11 }}>
        {unit}
      </span>
    </div>
  );

  return (
    <div>
      <fieldset style={box}>
        <legend style={legend}>Text</legend>
        {numField('Default text size:', 'defaultTextSizeMils', 'mils')}
        {numField('Overbar offset ratio:', 'overbarOffsetRatio', '%')}
        {numField(
          'Label offset ratio:',
          'labelOffsetRatio',
          '%',
          'Percentage of the text size to offset labels above (or below) a wire, bus, or pin',
        )}
        {numField(
          'Global label margin ratio:',
          'labelSizeRatio',
          '%',
          'Percentage of the text size to use as space around a global label',
        )}
      </fieldset>

      <fieldset style={box}>
        <legend style={legend}>Symbols</legend>
        {numField('Default line width:', 'defaultLineWidthMils', 'mils')}
        {numField('Pin symbol size:', 'pinSymbolSizeMils', 'mils')}
      </fieldset>

      <fieldset style={box}>
        <legend style={legend}>Connections</legend>
        <div style={row}>
          <span style={lab}>Junction dot size:</span>
          <select
            className="ze-select"
            value={value.junctionDotChoice}
            onChange={(e) => set('junctionDotChoice', Number(e.target.value))}
          >
            {JUNCTION_DOT_SIZES.map((s, i) => (
              <option key={s} value={i}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset style={box}>
        <legend style={legend}>Inter-sheet References</legend>
        <label style={{ display: 'block', margin: '4px 0', fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={value.intersheetRefsShow}
            onChange={(e) => set('intersheetRefsShow', e.target.checked)}
          />{' '}
          Show inter-sheet references
        </label>
        <label style={{ display: 'block', margin: '4px 0', fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={value.intersheetRefsOwnPage}
            disabled={!value.intersheetRefsShow}
            onChange={(e) => set('intersheetRefsOwnPage', e.target.checked)}
          />{' '}
          Show own page reference
        </label>
        <label style={{ display: 'block', margin: '4px 0', fontSize: 12.5 }}>
          <input
            type="radio"
            name="isrfmt"
            checked={!value.intersheetRefsAbbreviated}
            disabled={!value.intersheetRefsShow}
            onChange={() => set('intersheetRefsAbbreviated', false)}
          />{' '}
          Standard (1,2,3)
        </label>
        <label style={{ display: 'block', margin: '4px 0', fontSize: 12.5 }}>
          <input
            type="radio"
            name="isrfmt"
            checked={value.intersheetRefsAbbreviated}
            disabled={!value.intersheetRefsShow}
            onChange={() => set('intersheetRefsAbbreviated', true)}
          />{' '}
          Abbreviated (1..3)
        </label>
        <div style={row}>
          <span style={lab}>Prefix:</span>
          <input
            className="ze-search"
            style={{ width: 60 }}
            value={value.intersheetRefsPrefix}
            disabled={!value.intersheetRefsShow}
            onChange={(e) => set('intersheetRefsPrefix', e.target.value)}
          />
          <span style={{ ...lab, width: 50, textAlign: 'right' }}>Suffix:</span>
          <input
            className="ze-search"
            style={{ width: 60 }}
            value={value.intersheetRefsSuffix}
            disabled={!value.intersheetRefsShow}
            onChange={(e) => set('intersheetRefsSuffix', e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset style={box}>
        <legend style={legend}>Dashed Lines</legend>
        {numField('Dash length:', 'dashLengthRatio', '')}
        {numField('Gap length:', 'gapLengthRatio', '')}
        <div className="ze-muted" style={{ fontSize: 11, marginTop: 4 }}>
          Dash and dot lengths are ratios of the line width.
        </div>
      </fieldset>
    </div>
  );
}

/**
 * Plot dialog. Counterpart: `eeschema/dialogs/dialog_plot_schematic_base.cpp`
 * (DIALOG_PLOT_SCHEMATIC). Top: Output directory + Design variant. Middle: a
 * three-column row — the "Output Format" radio box, the "Options" group, and a
 * right column holding the selected format's option group (PDF / PNG / DXF) plus
 * the always-present "Other Options". Footer: Plot Current Page / Close / Plot
 * All Pages.
 *
 * Formats the browser cannot generate (Postscript, DXF) are greyed in place; the
 * output directory is the browser's download folder, so that field is greyed.
 */

import { useState, type JSX } from 'react';
import { mmToIU } from '@ziroeda/common';
import type { PlotOpts } from '../render/plot.js';
import { BUILTIN_THEMES } from '../theme.js';

export type PlotFormat = 'svg' | 'pdf' | 'png';

interface Props {
  /** The editor's active theme id (the "Color theme:" default selection). */
  themeId?: string;
  onPlot: (format: PlotFormat, opts: PlotOpts, allPages: boolean, themeId: string) => void;
  onClose: () => void;
}

const FORMATS: { id: string; label: string; disabled?: boolean }[] = [
  { id: 'ps', label: 'Postscript', disabled: true },
  { id: 'pdf', label: 'PDF' },
  { id: 'svg', label: 'SVG' },
  { id: 'dxf', label: 'DXF', disabled: true },
  { id: 'png', label: 'PNG' },
];

export function DialogPlot({ themeId, onPlot, onClose }: Props): JSX.Element {
  const [format, setFormat] = useState<PlotFormat>('pdf');
  const [color, setColor] = useState(true);
  const [drawingSheet, setDrawingSheet] = useState(true);
  const [background, setBackground] = useState(true);
  const [themeSel, setThemeSel] = useState(
    themeId && BUILTIN_THEMES[themeId] ? themeId : '_builtin_default',
  );
  const [dpi, setDpi] = useState(300);
  const [minWidthMm, setMinWidthMm] = useState('0.1524');

  // Output Messages report panel (upstream WX_HTML_REPORT_PANEL).
  type MsgLevel = 'error' | 'warning' | 'action' | 'info';
  const [messages, setMessages] = useState<{ level: MsgLevel; text: string }[]>([]);
  const [show, setShow] = useState<Record<MsgLevel, boolean>>({
    error: true,
    warning: true,
    action: true,
    info: true,
  });
  const report = (level: MsgLevel, text: string): void =>
    setMessages((m) => [...m, { level, text }]);
  const errorCount = messages.filter((m) => m.level === 'error').length;
  const warnCount = messages.filter((m) => m.level === 'warning').length;
  const allOn = show.error && show.warning && show.action && show.info;

  const opts = (): PlotOpts => ({
    color,
    drawingSheet,
    background,
    dpi,
    defaultPenIU: mmToIU(Number(minWidthMm) || 0),
  });

  const ext = (): string => (format === 'pdf' ? 'PDF' : format === 'svg' ? 'SVG' : 'PNG');
  const doPlot = (allPages: boolean): void => {
    report('action', `Plotting ${allPages ? 'all pages' : 'current page'} as ${ext()}…`);
    onPlot(format, opts(), allPages, themeSel);
    report('info', `Plotted ${allPages ? 'all pages' : 'current page'} (${ext()}).`);
  };
  const saveLog = (): void => {
    const text = messages.map((m) => `[${m.level}] ${m.text}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'plot-messages.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const MSG_COLOR: Record<MsgLevel, string> = {
    error: 'rgb(230, 9, 13)',
    warning: 'rgb(209, 146, 0)',
    action: 'var(--chrome-fg)',
    info: 'var(--ze-muted, #9a9ca0)',
  };

  const group: React.CSSProperties = {
    border: '1px solid var(--chrome-border)',
    borderRadius: 4,
    padding: '6px 10px 8px',
    margin: 0,
  };
  const legend: React.CSSProperties = { fontSize: 11.5, padding: '0 4px', fontWeight: 600 };
  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12.5,
  };
  const lab: React.CSSProperties = { fontSize: 12 };
  // The Options group is a gridbag (label | control | units) like KiCad.
  const optGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr max-content',
    alignItems: 'center',
    gap: '10px 8px',
    fontSize: 12.5,
  };
  const span3: React.CSSProperties = { gridColumn: '1 / 4' };
  const ctrl2: React.CSSProperties = {
    gridColumn: '2 / 4',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div
        className="ze-modal"
        style={{ width: 820, maxWidth: '96vw', height: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ze-modal-header">
          Plot Schematic Options
          <span className="x" title="Cancel" onClick={onClose}>
            ✕
          </span>
        </div>
        <div
          className="ze-modal-body"
          style={{ display: 'block', padding: '10px 14px', maxHeight: '78vh', overflow: 'auto' }}
        >
          {/* Output directory + Design variant (one row, upstream bOutputDir). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={lab}>Output directory:</span>
            <input
              className="ze-search"
              style={{ flex: 1 }}
              disabled
              placeholder="Browser downloads folder"
              title="Plots download through the browser; the target folder is your download setting."
            />
            <span style={lab}>Design variant:</span>
            <select
              className="ze-select"
              disabled
              value="default"
              title="Design variants are not supported in the browser yet"
            >
              <option value="default">Default</option>
            </select>
          </div>

          {/* Three columns (upstream m_optionsSizer): Output Format and Options
              take their natural width; the right column grows to fill. */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <fieldset style={{ ...group, flex: '0 0 130px' }}>
              <legend style={legend}>Output Format</legend>
              {FORMATS.map((f) => (
                <label
                  key={f.id}
                  style={{
                    display: 'block',
                    margin: '4px 0',
                    fontSize: 12.5,
                    opacity: f.disabled ? 0.45 : 1,
                  }}
                  title={f.disabled ? 'Not supported in the browser yet' : undefined}
                >
                  <input
                    type="radio"
                    name="pfmt"
                    checked={format === f.id}
                    disabled={f.disabled}
                    onChange={() => setFormat(f.id as PlotFormat)}
                  />{' '}
                  {f.label}
                </label>
              ))}
            </fieldset>

            <fieldset style={{ ...group, flex: '0 0 250px' }}>
              <legend style={legend}>Options</legend>
              <div style={optGrid}>
                <span style={lab}>Page size:</span>
                <select className="ze-select" style={ctrl2} value="schematic" onChange={() => {}}>
                  <option value="schematic">Schematic size</option>
                  <option value="a4" disabled title="Not supported in the browser yet">
                    A4
                  </option>
                  <option value="a" disabled title="Not supported in the browser yet">
                    A
                  </option>
                </select>

                <label style={{ ...span3, ...row }}>
                  <input
                    type="checkbox"
                    checked={drawingSheet}
                    onChange={(e) => setDrawingSheet(e.target.checked)}
                  />{' '}
                  Plot drawing sheet
                </label>

                <div style={{ ...span3, height: 6 }} />

                <span style={lab}>Output mode:</span>
                <select
                  className="ze-select"
                  style={ctrl2}
                  value={color ? 'color' : 'bw'}
                  onChange={(e) => setColor(e.target.value === 'color')}
                >
                  <option value="color">Color</option>
                  <option value="bw">Black and White</option>
                </select>

                <span style={lab}>Color theme:</span>
                <select
                  className="ze-select"
                  style={ctrl2}
                  value={themeSel}
                  disabled={!color}
                  onChange={(e) => setThemeSel(e.target.value)}
                >
                  {Object.entries(BUILTIN_THEMES).map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <label style={{ ...span3, ...row }}>
                  <input
                    type="checkbox"
                    checked={color && background}
                    disabled={!color}
                    onChange={(e) => setBackground(e.target.checked)}
                    title="Plot the background color if the output format supports it"
                  />{' '}
                  Plot background color
                </label>

                <div style={{ ...span3, height: 6 }} />

                <span style={lab}>Minimum line width:</span>
                <input
                  className="ze-search"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={minWidthMm}
                  title="Selection of the default pen thickness used to draw items, when their thickness is set to 0."
                  onChange={(e) => setMinWidthMm(e.target.value)}
                />
                <span className="ze-muted" style={{ fontSize: 11 }}>
                  mm
                </span>
              </div>
            </fieldset>

            {/* Right column: the selected format's group + Other Options. */}
            <div
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {format === 'pdf' && (
                <fieldset style={group}>
                  <legend style={legend}>PDF Options</legend>
                  {[
                    'Generate property popups',
                    'Generate clickable links for hierarchical elements',
                    'Generate metadata from AUTHOR & SUBJECT variables',
                  ].map((l) => (
                    <label
                      key={l}
                      style={{ display: 'block', margin: '4px 0', fontSize: 12.5, opacity: 0.45 }}
                      title="Not supported in the browser yet"
                    >
                      <input type="checkbox" disabled /> {l}
                    </label>
                  ))}
                </fieldset>
              )}
              {format === 'png' && (
                <fieldset style={group}>
                  <legend style={legend}>PNG Options</legend>
                  <div style={row}>
                    <span style={{ fontSize: 12 }}>DPI:</span>
                    <input
                      className="ze-search"
                      type="number"
                      style={{ width: 90 }}
                      value={dpi}
                      min={72}
                      max={2400}
                      onChange={(e) =>
                        setDpi(Math.max(72, Math.min(2400, Number(e.target.value) || 300)))
                      }
                    />
                  </div>
                  <label
                    style={{ display: 'block', margin: '5px 0 0', fontSize: 12.5, opacity: 0.45 }}
                    title="Always on in the browser"
                  >
                    <input type="checkbox" disabled checked readOnly /> Anti-alias
                  </label>
                </fieldset>
              )}

              <fieldset style={group}>
                <legend style={legend}>Other Options</legend>
                <label
                  style={{ display: 'block', margin: '4px 0', fontSize: 12.5, opacity: 0.45 }}
                  title="The browser handles downloaded files"
                >
                  <input type="checkbox" disabled /> Open file after plot
                </label>
              </fieldset>
            </div>
          </div>

          {/* Output Messages (upstream WX_HTML_REPORT_PANEL). */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, marginBottom: 4 }}>Output Messages</div>
            <div
              style={{
                border: '1px solid var(--chrome-border)',
                borderRadius: 3,
                minHeight: 120,
                maxHeight: 180,
                overflow: 'auto',
                padding: '4px 8px',
                fontSize: 12,
                fontFamily: 'var(--mono, monospace)',
                background: 'var(--chrome-bg2)',
              }}
            >
              {messages.filter((m) => show[m.level]).length === 0 ? (
                <span style={{ color: 'var(--ze-muted, #888)' }}>—</span>
              ) : (
                messages
                  .filter((m) => show[m.level])
                  .map((m, i) => (
                    <div key={i} style={{ color: MSG_COLOR[m.level] }}>
                      {m.text}
                    </div>
                  ))
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 6,
                fontSize: 12,
              }}
            >
              <span>Show:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={(e) =>
                    setShow({
                      error: e.target.checked,
                      warning: e.target.checked,
                      action: e.target.checked,
                      info: e.target.checked,
                    })
                  }
                />
                All
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={show.error}
                  onChange={(e) => setShow((s) => ({ ...s, error: e.target.checked }))}
                />
                Errors <span className="ze-count-badge">{errorCount}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={show.warning}
                  onChange={(e) => setShow((s) => ({ ...s, warning: e.target.checked }))}
                />
                Warnings <span className="ze-count-badge">{warnCount}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={show.action}
                  onChange={(e) => setShow((s) => ({ ...s, action: e.target.checked }))}
                />
                Actions
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={show.info}
                  onChange={(e) => setShow((s) => ({ ...s, info: e.target.checked }))}
                />
                Infos
              </label>
              <span style={{ flex: 1 }} />
              <button
                className="ze-btn sm"
                disabled={messages.length === 0}
                onClick={saveLog}
                title="Save the report to a text file"
              >
                Save…
              </button>
            </div>
          </div>
        </div>
        <div className="ze-modal-footer">
          {/* KiCad std-button order (GTK): Plot Current Page (Apply), Close, Plot All Pages (OK). */}
          <button className="ze-btn" onClick={() => doPlot(false)}>
            Plot Current Page
          </button>
          <button className="ze-btn" onClick={onClose}>
            Close
          </button>
          <button className="ze-btn primary" onClick={() => doPlot(true)}>
            Plot All Pages
          </button>
        </div>
      </div>
    </div>
  );
}

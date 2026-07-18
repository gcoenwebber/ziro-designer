/**
 * Page Settings dialog. Counterpart: `common/dialogs/dialog_page_settings.cpp`
 * (DIALOG_PAGES_SETTINGS) as opened by SCH_EDIT_FRAME. Left column: Paper
 * (size, orientation, custom size, export checkbox) over a page preview.
 * Right column: Drawing Sheet file, the sheet tallies, and the Title Block
 * Parameters (issue date with "<<<" picker apply, revision, title, company,
 * nine comment lines) — each with its own "Export to other sheets" checkbox
 * that copies the field to every other sheet on OK, like upstream.
 */

import { useState, type JSX } from 'react';
import type { PageSettings } from '@ziroeda/eeschema';
import { PAPER_CHOICES, PAPER_MM } from '../../drawingsheet/PageSettingsDialog.js';

/** Which fields the "Export to other sheets" checkboxes propagate on OK. */
export interface PageExportFlags {
  paper: boolean;
  date: boolean;
  rev: boolean;
  title: boolean;
  company: boolean;
  comments: boolean[];
}

interface Props {
  value: PageSettings;
  /** "Number of sheets: %d" / "Sheet number: %d" static texts. */
  sheetCount: number;
  sheetNumber: number;
  onOk: (next: PageSettings, exports: PageExportFlags) => void;
  onCancel: () => void;
}

/** Split a stored paper token into the dialog's size/orientation/custom state. */
function fromToken(paper: string): {
  size: string;
  portrait: boolean;
  customW: number;
  customH: number;
} {
  const parts = paper.split(/\s+/).filter(Boolean);
  const name = parts[0] ?? 'A4';
  if (name === 'User') {
    return {
      size: 'User',
      portrait: false,
      customW: Number(parts[1] ?? 431.8),
      customH: Number(parts[2] ?? 279.4),
    };
  }
  return { size: name, portrait: parts.includes('portrait'), customW: 431.8, customH: 279.4 };
}

/** Rebuild the stored paper token from the dialog state. */
function toToken(size: string, portrait: boolean, customW: number, customH: number): string {
  if (size === 'User') return `User ${customW} ${customH}`;
  return portrait ? `${size} portrait` : size;
}

export function DialogPageSettings({
  value,
  sheetCount,
  sheetNumber,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const seed = fromToken(value.paper);
  const [size, setSize] = useState(seed.size);
  const [portrait, setPortrait] = useState(seed.portrait);
  const [customW, setCustomW] = useState(seed.customW);
  const [customH, setCustomH] = useState(seed.customH);
  const [title, setTitle] = useState(value.title);
  const [date, setDate] = useState(value.date);
  const [pickDate, setPickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rev, setRev] = useState(value.rev);
  const [company, setCompany] = useState(value.company);
  const [comments, setComments] = useState<string[]>(() => {
    const c = [...value.comments];
    while (c.length < 9) c.push('');
    return c.slice(0, 9);
  });
  const [exports, setExports] = useState<PageExportFlags>({
    paper: false,
    date: false,
    rev: false,
    title: false,
    company: false,
    comments: Array(9).fill(false) as boolean[],
  });

  const submit = (): void => {
    onOk(
      {
        paper: toToken(size, portrait, customW, customH),
        title,
        date,
        rev,
        company,
        comments,
      },
      exports,
    );
  };

  const pageMM = ((): [number, number] => {
    if (size === 'User') return [customW, customH];
    const dims = PAPER_MM[size] ?? [297, 210];
    return portrait ? [dims[1], dims[0]] : [dims[0], dims[1]];
  })();

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '4px 0',
  };
  const lab: React.CSSProperties = { width: 78, fontSize: 12, flex: '0 0 auto' };
  const heading: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 12,
    margin: '6px 0',
    textAlign: 'center',
    borderBottom: '1px solid var(--chrome-border)',
    paddingBottom: 3,
  };
  const exportChk = (checked: boolean, set: (v: boolean) => void): JSX.Element => (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, flex: '0 0 auto' }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
      Export to other sheets
    </label>
  );

  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div
        className="ze-modal"
        style={{ width: 760, maxWidth: '96vw' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ze-modal-header">
          Page Settings
          <span className="x" onClick={onCancel}>
            ✕
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 18,
            padding: '10px 14px',
            maxHeight: '72vh',
            overflow: 'auto',
          }}
        >
          <div style={{ flex: '0 0 240px' }}>
            <div style={heading}>Paper</div>
            <div style={row}>
              <span style={lab}>Size:</span>
              <select
                className="ze-select"
                style={{ flex: 1 }}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                autoFocus
              >
                {PAPER_CHOICES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={row}>
              <span style={lab}>Orientation:</span>
              <select
                className="ze-select"
                style={{ flex: 1 }}
                value={portrait ? 'portrait' : 'landscape'}
                disabled={size === 'User'}
                onChange={(e) => setPortrait(e.target.value === 'portrait')}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Custom paper size:</div>
            <div style={row}>
              <span style={lab}>Height:</span>
              <input
                className="ze-search"
                type="number"
                style={{ width: 90 }}
                value={customH}
                disabled={size !== 'User'}
                title="Custom paper height."
                onChange={(e) => setCustomH(Number(e.target.value) || 0)}
              />
              <span className="ze-muted" style={{ fontSize: 11 }}>
                mm
              </span>
            </div>
            <div style={row}>
              <span style={lab}>Width:</span>
              <input
                className="ze-search"
                type="number"
                style={{ width: 90 }}
                value={customW}
                disabled={size !== 'User'}
                title="Custom paper width."
                onChange={(e) => setCustomW(Number(e.target.value) || 0)}
              />
              <span className="ze-muted" style={{ fontSize: 11 }}>
                mm
              </span>
            </div>
            {exportChk(exports.paper, (v) => setExports({ ...exports, paper: v }))}
            <div style={{ ...heading, marginTop: 16 }}>Preview</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              {/* m_PageLayoutExampleBitmap: page outline + title-block corner. */}
              <div
                style={{
                  width: pageMM[0] >= pageMM[1] ? 180 : (180 * pageMM[0]) / pageMM[1],
                  height: pageMM[0] >= pageMM[1] ? (180 * pageMM[1]) / pageMM[0] : 180,
                  background: '#fff',
                  border: '1px solid #888',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 6,
                    border: '1px solid #b33',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    bottom: 6,
                    width: '42%',
                    height: '18%',
                    borderLeft: '1px solid #b33',
                    borderTop: '1px solid #b33',
                  }}
                />
              </div>
            </div>
            <div className="ze-muted" style={{ fontSize: 11, textAlign: 'center' }}>
              {pageMM[0]} × {pageMM[1]} mm
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={heading}>Drawing Sheet</div>
            <div style={row}>
              <span style={{ ...lab, width: 34 }}>File:</span>
              <input
                className="ze-search"
                style={{ flex: 1 }}
                disabled
                title="Custom drawing sheet files are not supported yet."
              />
            </div>
            <div style={{ ...heading, marginTop: 10 }}>Title Block Parameters</div>
            <div style={{ display: 'flex', fontSize: 12, margin: '2px 0 6px' }}>
              <span>Number of sheets: {sheetCount}</span>
              <span style={{ flex: 1 }} />
              <span>Sheet number: {sheetNumber}</span>
            </div>
            <div style={row}>
              <span style={lab}>Issue Date:</span>
              <input
                className="ze-search"
                style={{ flex: 1 }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className="ze-btn"
                title="Apply the picked date"
                onClick={() => setDate(pickDate)}
              >
                &lt;&lt;&lt;
              </button>
              <input
                className="ze-search"
                type="date"
                style={{ width: 130 }}
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
              />
              {exportChk(exports.date, (v) => setExports({ ...exports, date: v }))}
            </div>
            <div style={row}>
              <span style={lab}>Revision:</span>
              <input
                className="ze-search"
                style={{ flex: 1 }}
                value={rev}
                onChange={(e) => setRev(e.target.value)}
              />
              {exportChk(exports.rev, (v) => setExports({ ...exports, rev: v }))}
            </div>
            <div style={row}>
              <span style={lab}>Title:</span>
              <input
                className="ze-search"
                style={{ flex: 1 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {exportChk(exports.title, (v) => setExports({ ...exports, title: v }))}
            </div>
            <div style={row}>
              <span style={lab}>Company:</span>
              <input
                className="ze-search"
                style={{ flex: 1 }}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              {exportChk(exports.company, (v) => setExports({ ...exports, company: v }))}
            </div>
            {comments.map((c, i) => (
              <div style={row} key={i}>
                <span style={lab}>Comment{i + 1}:</span>
                <input
                  className="ze-search"
                  style={{ flex: 1 }}
                  value={c}
                  onChange={(e) => {
                    const next = [...comments];
                    next[i] = e.target.value;
                    setComments(next);
                  }}
                />
                {exportChk(exports.comments[i]!, (v) => {
                  const next = [...exports.comments];
                  next[i] = v;
                  setExports({ ...exports, comments: next });
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="ze-modal-footer">
          <button className="ze-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="ze-btn primary" onClick={submit}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

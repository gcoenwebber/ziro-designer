/**
 * Print dialog. Counterpart: `eeschema/printing/dialog_print.cpp` (DIALOG_PRINT
 * for eeschema, dialog_print_base.cpp) — the same control order: "Print
 * drawing sheet", "Output mode:" choice, "Print background color", the
 * different-print-theme option, and a Page Setup... button beside the
 * standard buttons. "Print" renders the current sheet into the browser's
 * print flow.
 */

import { useState, type JSX } from 'react';
import type { PlotOpts } from '../render/plot.js';

interface Props {
  onPrint: (opts: PlotOpts) => void;
  /** Page Setup... button (upstream m_buttonPageSetup opens the page dialog). */
  onPageSetup?: () => void;
  onClose: () => void;
}

export function DialogPrint({ onPrint, onPageSetup, onClose }: Props): JSX.Element {
  const [color, setColor] = useState(true);
  const [drawingSheet, setDrawingSheet] = useState(true);
  const [background, setBackground] = useState(false);

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div
        className="ze-modal"
        style={{ width: 380, maxWidth: '92vw' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ze-modal-header">
          Print
          <span className="x" title="Cancel" onClick={onClose}>
            ✕
          </span>
        </div>
        <div className="ze-modal-body" style={{ padding: '10px 14px' }}>
          <label
            style={{ display: 'block', margin: '4px 0' }}
            title="Print (or not) the Frame references."
          >
            <input
              type="checkbox"
              checked={drawingSheet}
              onChange={(e) => setDrawingSheet(e.target.checked)}
            />{' '}
            Print drawing sheet
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
            <span style={{ fontSize: 12 }}>Output mode:</span>
            <select
              className="ze-select"
              style={{ flex: 1 }}
              value={color ? 'color' : 'bw'}
              onChange={(e) => setColor(e.target.value === 'color')}
            >
              <option value="color">Color</option>
              <option value="bw">Black and White</option>
            </select>
          </div>
          <label style={{ display: 'block', margin: '4px 0' }}>
            <input
              type="checkbox"
              checked={background}
              disabled={!color}
              onChange={(e) => setBackground(e.target.checked)}
            />{' '}
            Print background color
          </label>
          <label
            style={{ display: 'block', margin: '4px 0', opacity: 0.45 }}
            title="Not supported yet — printing uses the editor theme"
          >
            <input type="checkbox" disabled /> Use a different color theme for printing:
          </label>
        </div>
        <div className="ze-modal-footer">
          {onPageSetup && (
            <button className="ze-btn" onClick={onPageSetup}>
              Page Setup...
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="ze-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="ze-btn primary"
            onClick={() => onPrint({ color, drawingSheet, background })}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

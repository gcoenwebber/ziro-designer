import { useState } from 'react';
import { iuToMM } from '@ziroeda/common';
import type { ErcViolation } from '@ziroeda/eeschema';

/**
 * Electrical Rules Checker, after KiCad's DIALOG_ERC (dialog_erc_base.cpp):
 * an annotation infobar, a Violations / Ignored Tests notebook, the "Show:"
 * severity-filter row with number badges and a Save... report button, and the
 * Delete Marker / Delete All Markers / Run ERC / Close button row. Rendered as
 * a floating modeless panel so the sheet stays visible while stepping through
 * faults, like the upstream dialog.
 */

export interface ErcFilters {
  errors: boolean;
  warnings: boolean;
  exclusions: boolean;
}

interface Props {
  violations: readonly ErcViolation[];
  /** Rules whose severity is set to 'ignore' (the Ignored Tests tab). */
  ignoredTests: readonly string[];
  /** Severity display filters (EESCHEMA_SETTINGS m_Appearance.show_erc_*). */
  filters: ErcFilters;
  onFilterChange: (f: ErcFilters) => void;
  /** Schematic not fully annotated: DIALOG_ERC shows an infobar warning. */
  unannotated?: boolean;
  onShowAnnotate?: () => void;
  onRun: () => void;
  onLocate: (v: ErcViolation) => void;
  /** Delete Marker / Delete All Markers (index into `violations`). */
  onDelete: (index: number) => void;
  onDeleteAll: () => void;
  /** "Edit ignored tests" link: opens Schematic Setup > Violation Severity. */
  onEditSeverities?: () => void;
  onClose: () => void;
}

const fmt = (iu: number): string => `${iuToMM(iu).toFixed(2)} mm`;

export function ErcDialog({
  violations,
  ignoredTests,
  filters,
  onFilterChange,
  unannotated,
  onShowAnnotate,
  onRun,
  onLocate,
  onDelete,
  onDeleteAll,
  onEditSeverities,
  onClose,
}: Props): JSX.Element {
  const [tab, setTab] = useState<'violations' | 'ignored'>('violations');
  const [selected, setSelected] = useState<number | null>(null);

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.length - errors;
  const all = filters.errors && filters.warnings && filters.exclusions;

  const shown = violations
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => (v.severity === 'error' ? filters.errors : filters.warnings));

  // DIALOG_ERC::OnSaveReport — a plain-text .rpt like ERC_REPORT::GetTextReport.
  const saveReport = (): void => {
    const lines = [
      `ERC report (${new Date().toISOString()})`,
      '',
      ...violations.flatMap((v) => [
        `[${v.severity}]: ${v.message}`,
        `    @(${fmt(v.at.x)}, ${fmt(v.at.y)})`,
      ]),
      '',
      ` ** ERC messages: ${violations.length}  Errors ${errors}  Warnings ${warnings}`,
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erc.rpt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ze-erc-panel">
      <div className="ze-modal-header">
        Electrical Rules Checker
        <span className="x" onClick={onClose}>
          ✕
        </span>
      </div>

      {unannotated && (
        <div className="ze-infobar">
          Schematic is not fully annotated. ERC results will be incomplete.
          {onShowAnnotate && (
            <a onClick={onShowAnnotate} className="lnk">
              Show Annotation dialog
            </a>
          )}
        </div>
      )}

      <div className="ze-erc-tabs">
        <div
          className={`tab${tab === 'violations' ? ' active' : ''}`}
          onClick={() => setTab('violations')}
        >
          Violations ({violations.length})
        </div>
        <div
          className={`tab${tab === 'ignored' ? ' active' : ''}`}
          onClick={() => setTab('ignored')}
        >
          Ignored Tests ({ignoredTests.length})
        </div>
      </div>

      {tab === 'violations' ? (
        <div className="ze-erc-list">
          {shown.length === 0 && <div className="ze-erc-empty">No ERC violations found.</div>}
          {shown.map(({ v, i }) => (
            <div
              key={i}
              className={`ze-erc-row ${v.severity}${selected === i ? ' selected' : ''}`}
              onClick={() => {
                setSelected(i);
                onLocate(v);
              }}
            >
              <span className="sev">⏺</span>
              <span className="msg">
                {v.message}
                <span className="pos">
                  @({fmt(v.at.x)}, {fmt(v.at.y)})
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="ze-erc-list">
          {ignoredTests.length === 0 && <div className="ze-erc-empty">No ignored tests.</div>}
          {ignoredTests.map((t) => (
            <div key={t} className="ze-erc-row">
              <span className="msg">{t}</span>
            </div>
          ))}
          {onEditSeverities && (
            <a className="ze-erc-link" onClick={onEditSeverities}>
              Edit ignored tests
            </a>
          )}
        </div>
      )}

      <div className="ze-erc-footer">
        <span>Show:</span>
        <label className="chk">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) =>
              onFilterChange({
                errors: e.target.checked,
                warnings: e.target.checked,
                exclusions: e.target.checked,
              })
            }
          />
          All
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={filters.errors}
            onChange={(e) => onFilterChange({ ...filters, errors: e.target.checked })}
          />
          Errors
        </label>
        <span className="badge err">{errors}</span>
        <label className="chk">
          <input
            type="checkbox"
            checked={filters.warnings}
            onChange={(e) => onFilterChange({ ...filters, warnings: e.target.checked })}
          />
          Warnings
        </label>
        <span className="badge warn">{warnings}</span>
        <label className="chk">
          <input
            type="checkbox"
            checked={filters.exclusions}
            onChange={(e) => onFilterChange({ ...filters, exclusions: e.target.checked })}
          />
          Exclusions
        </label>
        <span className="badge">0</span>
        <span className="grow" />
        <button className="ze-btn" onClick={saveReport}>
          Save...
        </button>
      </div>

      <div className="ze-erc-buttons">
        <button
          className="ze-btn"
          disabled={selected === null}
          onClick={() => {
            if (selected !== null) {
              onDelete(selected);
              setSelected(null);
            }
          }}
        >
          Delete Marker
        </button>
        <button className="ze-btn" disabled={violations.length === 0} onClick={onDeleteAll}>
          Delete All Markers
        </button>
        <span className="grow" />
        <button className="ze-btn primary" onClick={onRun}>
          Run ERC
        </button>
        <button className="ze-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { LabelKind, LabelShape } from '@ziroeda/eeschema';

/** Flag shapes offered for global/hierarchical labels, as in KiCad's dialog. */
const SHAPES: { value: LabelShape; label: string }[] = [
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
  { value: 'bidirectional', label: 'Bidirectional' },
  { value: 'tri_state', label: 'Tri-state' },
  { value: 'passive', label: 'Passive' },
];

const TITLES: Record<LabelKind, string> = {
  label: 'Label Properties',
  global_label: 'Global Label Properties',
  hierarchical_label: 'Hierarchical Label Properties',
  text: 'Text Properties',
};

interface Props {
  kind: LabelKind;
  onOk: (text: string, shape: LabelShape) => void;
  onCancel: () => void;
  /** Pre-fill when editing an existing label (Properties), vs placing a new one. */
  initialText?: string;
  initialShape?: LabelShape;
}

/**
 * KiCad-style label properties dialog: enter the net/label name and (for
 * global/hierarchical labels) pick the flag shape. Used both to place a new
 * label and to edit an existing one (DIALOG_LABEL_PROPERTIES).
 */
export function LabelDialog({
  kind,
  onOk,
  onCancel,
  initialText,
  initialShape,
}: Props): JSX.Element {
  const [text, setText] = useState(initialText ?? '');
  const [shape, setShape] = useState<LabelShape>(initialShape ?? 'bidirectional');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasShape = kind === 'global_label' || kind === 'hierarchical_label';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (): void => {
    if (text.trim()) onOk(text.trim(), shape);
  };

  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal ze-label-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          {TITLES[kind]}
          <span className="x" onClick={onCancel}>
            ✕
          </span>
        </div>
        <div className="ze-label-dialog-body">
          <label className="row">
            <span>{kind === 'text' ? 'Text:' : 'Label:'}</span>
            <input
              ref={inputRef}
              className="ze-search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancel();
                }
              }}
            />
          </label>
          {hasShape && (
            <fieldset
              style={{
                border: '1px solid var(--chrome-border)',
                borderRadius: 4,
                padding: '4px 10px 8px',
                margin: '8px 0 0',
              }}
            >
              <legend style={{ fontSize: 11.5, padding: '0 4px' }}>Shape</legend>
              {SHAPES.map((s) => (
                <label key={s.value} style={{ display: 'block', margin: '3px 0', fontSize: 12.5 }}>
                  <input
                    type="radio"
                    name="labelshape"
                    checked={shape === s.value}
                    onChange={() => setShape(s.value)}
                  />{' '}
                  {s.label}
                </label>
              ))}
            </fieldset>
          )}
        </div>
        <div className="ze-modal-footer">
          <button className="ze-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="ze-btn primary" disabled={!text.trim()} onClick={submit}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Footprint drop-down of the symbol chooser. Mirrors
 * kicad/common/widgets/footprint_select_widget.cpp
 * (FOOTPRINT_SELECT_WIDGET): the default footprint entry at the top —
 * "[Default] <fp>" or "No default footprint" — followed by filter matches.
 * The web app has no footprint-library backend to run the pin-count/filter
 * query against, so only the default entry and the symbol's explicit filter
 * globs are listed (upstream degrades the same way when the pcbnew kiface is
 * unavailable).
 */
import { useMemo } from 'react';

export interface FootprintSelectWidgetProps {
  /** The symbol's default footprint LIB_ID text ('' = none). */
  defaultFootprint: string;
  /** The symbol's ki_fp_filters globs, shown as extra (unresolvable) hints. */
  filters?: readonly string[];
  /** Currently selected footprint ('' = the default entry). */
  value: string;
  disabled?: boolean;
  /** EVT_FOOTPRINT_SELECTED — the user picked an entry. */
  onFootprintSelected: (footprint: string) => void;
}

export function FootprintSelectWidget({
  defaultFootprint,
  filters = [],
  value,
  disabled = false,
  onFootprintSelected,
}: FootprintSelectWidgetProps): JSX.Element {
  const defaultLabel = defaultFootprint ? `[Default] ${defaultFootprint}` : 'No default footprint';

  // Filter globs that are fully-qualified LIB_IDs (Lib:Name, no wildcards)
  // are directly selectable, like upstream's explicitly associated footprints.
  const extraEntries = useMemo(
    () => filters.filter((f) => f.includes(':') && !/[*?]/.test(f) && f !== defaultFootprint),
    [filters, defaultFootprint],
  );

  return (
    <select
      className="ze-fp-select"
      disabled={disabled}
      value={value}
      onChange={(e) => onFootprintSelected(e.target.value)}
    >
      <option value="">{defaultLabel}</option>
      {extraEntries.map((fp) => (
        <option key={fp} value={fp}>
          {fp}
        </option>
      ))}
    </select>
  );
}

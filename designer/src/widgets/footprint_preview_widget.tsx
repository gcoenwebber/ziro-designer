/**
 * Footprint preview pane of the chooser dialogs. Mirrors
 * kicad/common/widgets/footprint_preview_widget.cpp
 * (FOOTPRINT_PREVIEW_WIDGET): a preview area with a status text that replaces
 * the canvas when there is nothing to draw. The web app does not ship the
 * footprint libraries, so the pane always runs in status mode — footprint
 * name plus the reason no geometry is shown — exactly like upstream when the
 * preview backend is unavailable.
 */

export interface FootprintPreviewWidgetProps {
  /** Footprint LIB_ID text to display, '' for none (SetStatusText branch). */
  footprint: string;
  /** Status label, e.g. "No footprint specified" (upstream SetStatusText). */
  statusText: string;
}

export function FootprintPreviewWidget({
  footprint,
  statusText,
}: FootprintPreviewWidgetProps): JSX.Element {
  return (
    <div className="ze-fp-preview">
      {footprint ? (
        <div className="ze-fp-note">
          <div className="fp-name">{footprint}</div>
          <div className="ze-muted">
            Footprint preview needs the footprint libraries (not loaded).
          </div>
        </div>
      ) : (
        <div className="ze-muted">{statusText}</div>
      )}
    </div>
  );
}

/**
 * Maps each toolbar tool id to KiCad's own icon (the dark-theme SVGs vendored
 * under assets/toolbar). Bitmap names are taken from KiCad's SCH_ACTIONS /
 * ACTIONS `.Icon(BITMAPS::…)` definitions. GPL like this project.
 */
const URLS = import.meta.glob('../assets/toolbar/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const BITMAP: Record<string, string> = {
  // top toolbar
  new: 'new_generic', open: 'directory_open', save: 'save', schematicSetup: 'options_schematic',
  pageSettings: 'sheetset', print: 'print_button', plot: 'plot', paste: 'paste', undo: 'undo', redo: 'redo',
  find: 'find', findReplace: 'find_replace', zoomRedraw: 'refresh', zoomIn: 'zoom_in', zoomOut: 'zoom_out',
  zoomFit: 'zoom_fit_in_page', zoomFitObjects: 'zoom_fit_to_objects', zoomTool: 'zoom_area',
  navBack: 'left', navUp: 'up', navFwd: 'right', rotateCCW: 'rotate_ccw', rotateCW: 'rotate_cw',
  mirrorV: 'mirror_v', mirrorH: 'mirror_h', group: 'group', ungroup: 'group_ungroup',
  symbolEditor: 'libedit', symbolBrowser: 'library_browser', footprintEditor: 'module_editor',
  annotate: 'annotate', erc: 'erc', simulator: 'simulator', assignFootprints: 'icon_cvpcb_24',
  editSymbolFields: 'spreadsheet', bom: 'post_bom',
  // left toolbar
  toggleGrid: 'grid', toggleGridOverrides: 'grid_override', unitsInches: 'unit_inch', unitsMils: 'unit_mil',
  unitsMm: 'unit_mm', crosshairSmall: 'cursor_shape', crosshairFull: 'cursor_fullscreen',
  toggleHiddenPins: 'hidden_pin', lineModeFree: 'lines_any', lineMode90: 'lines90', lineMode45: 'hv45mode',
  annotateAuto: 'annotate', showHierarchy: 'hierarchy_nav', showProperties: 'tools',
  // right toolbar
  select: 'cursor', highlightNet: 'net_highlight_schematic', placeSymbol: 'add_component',
  placePower: 'add_power', drawWire: 'add_line', drawBus: 'add_bus', busEntry: 'add_line2bus',
  noConnect: 'noconn', junction: 'add_junction', placeLabel: 'add_label', placeGlobalLabel: 'add_glabel',
  placeHierLabel: 'add_hierarchical_label', drawSheet: 'add_hierarchical_subsheet', sheetPin: 'add_hierar_pin',
  placeText: 'text', textBox: 'add_textbox', table: 'table', rectangle: 'add_rectangle', circle: 'add_circle',
  arc: 'add_arc', bezier: 'add_bezier', lines: 'add_graphical_segments', image: 'image', delete: 'delete_cursor',
};

/** KiCad icon URL for a toolbar tool id, or undefined if none is mapped. */
export function toolbarIconUrl(id: string): string | undefined {
  const name = BITMAP[id];
  return name ? URLS[`../assets/toolbar/${name}.svg`] : undefined;
}

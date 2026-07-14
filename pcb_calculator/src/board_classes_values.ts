/**
 * "Board Classes" memo table: typical manufacturing capabilities per class
 * (finer class ⇒ tighter geometry ⇒ higher cost).
 * Counterpart: KiCad `pcb_calculator/board_classes_values.cpp`
 * + `calculator_panels/panel_board_class.cpp`.
 */

export const BOARD_CLASS_COUNT = 6;

export interface BoardClassRow {
  label: string;
  /** One value per class 1…6, in millimetres. */
  mm: readonly number[];
}

export const BOARD_CLASS_ROWS: readonly BoardClassRow[] = [
  { label: 'Lines width', mm: [0.8, 0.5, 0.31, 0.21, 0.15, 0.12] },
  { label: 'Minimum spacing between lines', mm: [0.68, 0.5, 0.31, 0.21, 0.15, 0.12] },
  { label: 'Via: diameter', mm: [1.19, 0.8, 0.6, 0.46, 0.38, 0.25] },
  { label: 'Via: drill diameter', mm: [0.66, 0.4, 0.3, 0.2, 0.15, 0.1] },
  { label: 'Plated pad: diameter', mm: [1.7, 1.2, 0.9, 0.65, 0.55, 0.45] },
  { label: 'Plated pad: drill diameter', mm: [1.0, 0.7, 0.5, 0.35, 0.25, 0.2] },
  { label: 'Unplated pad: diameter', mm: [2.4, 1.8, 1.4, 1.2, 1.0, 0.9] },
  { label: 'Unplated pad: drill diameter', mm: [1.6, 1.2, 0.9, 0.8, 0.7, 0.6] },
];

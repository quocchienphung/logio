export type CellType = "s" | "n" | "inlineStr" | "str" | "b" | "e" | "d";

export interface Cell {
  t: CellType;
  /** The text of the cell as Excel displays it for text types; the raw number text for `n`. */
  v: string;
  /** Style index (`s` attribute) so a patched cell keeps its format. */
  s: number;
  /** The cell holds a formula (the cached result is in `v`). */
  f?: true;
  /** Unsupported mutation targets remain readable and are explicitly reported. */
  protectedText?: true;
}

export interface Row {
  /** 1-based Excel row number. */
  r: number;
  hidden: boolean;
  /** Indexed by 0-based column; holes are empty cells. */
  cells: (Cell | undefined)[];
}

export type StyleKind = "general" | "number" | "date" | "text";

export interface Sheet {
  name: string;
  /** Path of the worksheet part inside the zip. */
  part: string;
  dimension: string | null;
  rows: Row[];
  hiddenRows: number;
  hiddenColumns: number;
  mergeCount: number;
  autoFilter: boolean;
  formulaCount: number;
  /** Rows present in the XML that hold no value at all. */
  emptyRows: number;
  /** Explicit blank cells in skipped formatting-only rows; preserved in XML and included in repair accounting. */
  emptyCells?: number;
  maxCol: number;
}

export interface Workbook {
  fileName: string;
  size: number;
  /** Fingerprint of the file's bytes; ties every issue to the exact file it came from. */
  fileHash: string;
  sheets: Sheet[];
  styleKinds: StyleKind[];
  /** Defined names, calc mode and similar facts that the export must not disturb. */
  notes: string[];
}

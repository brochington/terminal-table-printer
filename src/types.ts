import { BackgroundColorName, ForegroundColorName } from "chalk";

/** Basic data types that can exist in a cell. */
export type CellTypes = string | number | boolean | null;

/** Defines the visual style for a cell or header. */
export interface Style {
  color?: ForegroundColorName;
  backgroundColor?: BackgroundColorName;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/** Defines the characters used to draw the table borders. */
export interface BorderChars {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  headerLeft: string; // e.g., ├
  headerRight: string; // e.g., ┤
  topSeparator: string; // e.g., ┬ (for the top border)
  middleSeparator: string; // e.g., ┼ (for under the header)
  bottomSeparator: string; // e.g., ┴ (for the bottom border)
  cellSeparator: string; // e.g., │ (for inside data rows)
}

/** Defines configuration overrides for a specific column. */
export interface ColumnConfig {
  header?: string;
  alignment?: 'left' | 'right' | 'center';
  style?: Style;
  headerStyle?: Style;
  formatter?: (value: CellTypes) => string;
}

/** Information passed to the footer rendering function. */
export interface FooterInfo {
  totalRows: number;
  displayedRows: number;
  isTruncated: boolean;
  startRow: number;
  endRow: number;
}

/** The main configuration object for the TableFormatter. */
export interface TableConfig {
  maxWidth?: number;
  padding?: { left: number; right: number };
  truncationChar?: string;
  rowLimit?: number;
  rowOffset?: number;
  border?: Partial<BorderChars>;
  header?: Style;
  cell?: Style;
  columns?: Record<string, ColumnConfig>;
  footer?: (info: FooterInfo) => string;
}

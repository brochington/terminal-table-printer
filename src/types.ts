import type { BackgroundColorName, ForegroundColorName } from "chalk";

export type JSONObject = Record<string, CellTypes>;

// Remove circular dependency
export type CellTypeObject = Record<string, string | number | boolean | null>;

/** Basic data types that can exist in a cell. */
export type CellTypes = string | number | boolean | null | CellTypeObject;

/**
 * Defines the visual style for a cell or header.
 * Colors can be standard chalk color names or hex codes (e.g., '#ff0000').
 */
export interface Style {
	color?: ForegroundColorName | string;
	backgroundColor?: BackgroundColorName | string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
}

/** A theme defines the default styles for all parts of the table. */
export interface TableTheme {
	header: Style;
	cell: Style;
	alternatingCell: Style; // Style for every other data row
	footer: Style;
}

/** Defines the characters used to draw the table borders. */
export interface BorderChars {
	horizontal: string;
	vertical: string;
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
	headerLeft: string;
	headerRight: string;
	topSeparator: string;
	middleSeparator: string;
	bottomSeparator: string;
	cellSeparator: string;
}

/** Defines configuration overrides for a specific column. */
export interface ColumnConfig {
	header?: string;
	alignment?: "left" | "right" | "center";
	style?: Style;
	headerStyle?: Style;
	formatter?: (value: CellTypes, rowIndex: number) => string;
	cellStyle?: (value: CellTypes) => Style | undefined;
	padding?: { left: number; right: number };
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
	columns?: Record<string, ColumnConfig>;
	footer?: (info: FooterInfo) => string;

	// New Theming and Style Options
	theme?: Partial<TableTheme>;
	alternatingRows?: boolean;
	rowStyle?: (row: JSONObject) => Style | undefined;
}

import type { CellTypes, JSONObject } from "./types";

/**
 * An interface representing a tabular data source.
 */
export interface ITableDataSource {
	getColumnNames(): string[];
	getRowCount(): number;
	getArrayRow(rowIndex: number): CellTypes[];
	getObjectRow(rowIndex: number): JSONObject;
}

import { ITableDataSource } from './ITableDataSource';
import { CellTypes } from './types';

/** A standard JSON object representing a single row. */
export type JSONObject = Record<string, CellTypes>;

/**
 * A data source for a simple array of JSON objects (the most common tabular format).
 */
export class JSONDataSource implements ITableDataSource {
  private data: JSONObject[];
  private columnNames: string[];

  constructor(jsonData: JSONObject[]) {
    this.data = jsonData ?? [];

    // Determine column names from the keys of the first object to maintain order.
    // If data is empty, the column list is empty.
    this.columnNames = this.data.length > 0 ? Object.keys(this.data[0]) : [];
  }

  getColumnNames(): string[] {
    return this.columnNames;
  }

  getRowCount(): number {
    return this.data.length;
  }

  getArrayRow(rowIndex: number): CellTypes[] {
    if (rowIndex < 0 || rowIndex >= this.data.length) {
      throw new Error(`Row index out of bounds: ${rowIndex}`);
    }
    const rowObject = this.data[rowIndex];

    // Map the values in the same order as the stored column names
    // to ensure consistency even if object key order varies.
    return this.columnNames.map((name) => rowObject[name] ?? null);
  }
}

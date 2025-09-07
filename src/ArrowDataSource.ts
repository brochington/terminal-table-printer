import { Table } from 'apache-arrow';
import { ITableDataSource } from './ITableDataSource';
import { CellTypes } from './types';

/**
 * A data source implementation for the Apache Arrow Table class.
 * It adapts an Arrow Table to the ITableDataSource interface.
 */
export class ArrowDataSource implements ITableDataSource {
  private table: Table;
  private columnNames: string[];

  constructor(table: Table) {
    this.table = table;
    this.columnNames = this.table.schema.fields.map((field) => field.name);
  }

  getColumnNames(): string[] {
    return this.columnNames;
  }

  getRowCount(): number {
    return this.table.numRows;
  }

  getArrayRow(rowIndex: number): CellTypes[] {
    const row = this.table.get(rowIndex);
    if (!row) {
      // This case should ideally not be hit if bounds are checked, but it's safe to handle.
      return this.columnNames.map(() => null);
    }

    // The .toJSON() method on the row proxy provides a convenient way
    // to get all values with reasonable default serialization.
    const rowJson = row.toJSON();

    // We map the values in the order of the schema's columns to ensure consistency.
    return this.columnNames.map((name, index) => {
      const field = this.table.schema.fields[index];
      const value = rowJson[name];

      // Handle potential BigInts from Arrow's Int64, which aren't supported in JSON.
      if (typeof value === 'bigint') {
        return value.toString();
      }

      // Handle timestamp fields by converting to ISO string
      if (field.type.toString().includes('Timestamp')) {
        // Arrow timestamps are stored as numbers (milliseconds since epoch)
        if (typeof value === 'number') {
          return new Date(value).toISOString();
        }
      }

      return value as CellTypes;
    });
  }
}

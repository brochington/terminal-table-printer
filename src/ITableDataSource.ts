import { CellTypes } from './types';

/**
 * An interface representing a tabular data source.
 */
export interface ITableDataSource {
  getColumnNames(): string[];
  getRowCount(): number;
  getArrayRow(rowIndex: number): CellTypes[];
}

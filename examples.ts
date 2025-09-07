import { TableFormatter, SINGLE_LINE_BORDER, DOUBLE_LINE_BORDER } from './src/TableFormatter';
import { JSONDataSource } from './src/JSONDataSource';
import { TableConfig } from './src/types';
import chalk from 'chalk';

const jsonData = [
  { id: 1001, name: 'Supernova Gizmo', value: 1299.99, stock: 15 },
  { id: 1002, name: 'Quantum Widget', value: 74.5, stock: 122 },
  { id: 1003, name: 'Hyperflux Capacitor', value: 5430.0, stock: 0 },
];
const jsonDataSource = new JSONDataSource(jsonData);

const config: TableConfig = {
  border: SINGLE_LINE_BORDER,
  header: { bold: true, color: 'cyan' },
  columns: {
    value: {
      header: 'Price',
      alignment: 'right',
      formatter: (val) => `$${Number(val).toFixed(2)}`,
      style: { color: 'green' },
    },
    stock: {
      alignment: 'right',
    },
  },
  footer: (info) =>
    `Displaying ${info.displayedRows} of ${info.totalRows} records.`,
};

// --- Render the Table ---
const jsonFormatter = new TableFormatter(jsonDataSource, config);
console.log(chalk.bold.yellow('--- Rendering with Single-Line Borders ---'));
console.log(jsonFormatter.render());

// --- Example with Double-Line Borders ---
const doubleLineFormatter = new TableFormatter(jsonDataSource, {
  ...config,
  border: DOUBLE_LINE_BORDER,
});
console.log(chalk.bold.yellow('\n--- Rendering with Double-Line Borders ---'));
console.log(doubleLineFormatter.render());

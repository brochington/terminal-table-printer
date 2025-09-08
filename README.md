# Terminal Table Printer

A TypeScript library for rendering JSON or Apache Arrow data into styled, responsive tables for terminal applications.

## Features

- **Data Sources**: Renders data from `JSONObject[]` or Apache Arrow `Table` objects.
- **Styling**: Customize colors (hex codes supported), background colors, and text styles (`bold`, `italic`, `underline`).
- **Dynamic Formatting**: Apply styles to rows or cells conditionally based on their data.
- **Layout Control**: Supports text alignment, per-column padding, and automatic content truncation based on a `maxWidth`.
- **Customizable**: Full control over border characters and themes.

## Installation

```bash
npm install terminal-table-printer
```

## Examples

### `npm run example`

<img width="867" height="1545" alt="Screenshot 2025-09-07 at 4 45 24 PM" src="https://github.com/user-attachments/assets/6dc95aac-bc03-4ab9-b3c1-e07dbe9b64ce" />

### `npm run matrix`

[Kapture 2025-09-07 at 16.47.02.webm](https://github.com/user-attachments/assets/006acbe7-acd2-4c09-a022-76a6d38861b6)


## Quick Start

```typescript

import { TableFormatter, JSONDataSource } from 'terminal-table-printer';

const data = [
  { id: 1001, product: 'Supernova Gizmo', price: 1299.99, stock: 15 },
  { id: 1002, product: 'Quantum Widget', price: 74.50, stock: 122 },
];

// 1. Create a data source
const dataSource = new JSONDataSource(data);

// 2. Configure the table
const config = {
  columns: {
    price: {
      header: 'Price',
      alignment: 'right',
      formatter: (val) => `$${Number(val).toFixed(2)}`,
      style: { color: 'green' },
    },
    stock: {
      alignment: 'right',
    },
  },
};

// 3. Create and render the table
const table = new TableFormatter(dataSource, config);
console.log(table.render());
```

**Output:**
```
┌──────┬─────────────────┬──────────┬───────┐
│ id   │ product         │    Price │ stock │
├──────┼─────────────────┼──────────┼───────┤
│ 1001 │ Supernova Gizmo │ $1299.99 │    15 │
│ 1002 │ Quantum Widget  │   $74.50 │   122 │
└──────┴─────────────────┴──────────┴───────┘
```

## Data Sources

The library accepts two types of data sources.

### `JSONDataSource`

Accepts an array of plain JavaScript objects (`JSONObject[]`). The keys from the first object are used as column identifiers.

```typescript
import { JSONDataSource } from 'terminal-table-printer';
const dataSource = new JSONDataSource([
  { name: 'Alice', role: 'Admin' },
  { name: 'Bob', role: 'User' },
]);
```

### `ArrowDataSource`

Accepts an `apache-arrow` `Table` object.

```typescript
import { ArrowDataSource } from 'terminal-table-printer';
import { tableFromArrays } from 'apache-arrow';

const arrowTable = tableFromArrays({
  name: ['Alice', 'Bob'],
  role: ['Admin', 'User'],
});
const dataSource = new ArrowDataSource(arrowTable);
```

## Configuration

The `TableFormatter` constructor accepts a `TableConfig` object to customize the output.

### Theming and Alternating Rows

Use the `theme` object for global styling and `alternatingRows` for readability. Colors can be standard `chalk` names or hex codes (e.g., `'#ff0000'`).

```typescript
const config = {
  alternatingRows: true,
  theme: {
    header: { color: '#268bd2', bold: true },
    cell: { color: '#839496' },
    alternatingCell: { backgroundColor: '#073642' },
    footer: { color: '#586e75', italic: true },
  },
};
```

### Column Configuration

The `columns` property allows you to configure each column by its key from the data source.

```typescript
const config = {
  columns: {
    // The key 'id' must match a key in your data
    id: {
      header: 'Product ID',           // Rename the column header
      alignment: 'center',             // 'left', 'right', or 'center'
      padding: { left: 2, right: 2 },  // Override global padding
      headerStyle: { color: 'yellow' },// Style only the header of this column
    },
    price: {
      // Format the cell value. Receives the value and its rowIndex.
      formatter: (value, rowIndex) => `$${Number(value).toFixed(2)}`,
      style: { color: 'green' },      // Style all data cells in this column
    },
  },
};
```

### Conditional Styling (Data-Driven)

Apply styles dynamically based on the data of a row or a specific cell. This is the most powerful styling feature.

The style precedence is: **`cellStyle` > `column.style` > `rowStyle` > `theme`**.

```typescript
const config = {
  // Style an entire row if a condition is met.
  // The function receives the full row object.
  rowStyle: (row) => {
    if (row.status === 'Discontinued') {
      return { color: 'red', italic: true };
    }
  },
  columns: {
    status: {
      // Style a specific cell based on its own value.
      cellStyle: (value) => {
        if (value === 'Active') return { color: 'green' };
        if (value === 'Backordered') return { color: 'yellow' };
      },
    },
  },
};
```

### Sizing, Pagination, and Borders

Control the table's dimensions and borders.

```typescript
import { DOUBLE_LINE_BORDER } from 'terminal-table-printer';

const config = {
  // Truncate table content if it exceeds 80 characters wide
  maxWidth: 80,
  
  // Display only 5 rows, starting from the 11th row (index 10)
  rowLimit: 5,
  rowOffset: 10,
  
  // Add a descriptive footer
  footer: (info) => `Showing rows ${info.startRow + 1}-${info.endRow} of ${info.totalRows}.`,
  
  // Use a pre-defined or custom border style
  border: DOUBLE_LINE_BORDER,
};
```

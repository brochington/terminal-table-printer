import {
  TableFormatter,
  DOUBLE_LINE_BORDER,
  SINGLE_LINE_BORDER,
} from './src/TableFormatter';
import { JSONDataSource } from './src/JSONDataSource';
import { ArrowDataSource } from './src/ArrowDataSource';
import { JSONObject, TableConfig, TableTheme } from './src/types';
import chalk from 'chalk';
import { tableFromArrays } from 'apache-arrow';

/**
 * Converts an HSL color value to a hex string.
 * This is used to programmatically generate a color gradient.
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns A hex color string (e.g., '#ff0000')
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (60 <= h && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (120 <= h && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (180 <= h && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (240 <= h && h < 300) {
    [r, g, b] = [x, 0, c];
  } else if (300 <= h && h < 360) {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// --- THEME STYLES (for demonstration) ---
const SOLARIZED_DARK_THEME: TableTheme = {
  header: { color: '#268bd2', bold: true },
  cell: { color: '#839496' },
  alternatingCell: { color: '#93a1a1', backgroundColor: '#073642' },
  footer: { color: '#586e75', italic: true },
};

// --- DATA (for demonstration) ---
const sampleData = [
  {
    id: 1001,
    name: 'Supernova Gizmo',
    value: 1299.99,
    stock: 15,
    status: 'Active',
  },
  {
    id: 1002,
    name: 'Quantum Widget',
    value: 74.5,
    stock: 122,
    status: 'Active',
  },
  {
    id: 1003,
    name: 'Hyperflux Capacitor - A very long name to test truncation',
    value: 5430.0,
    stock: 0,
    status: 'Discontinued',
  },
  {
    id: 1004,
    name: 'Galactic Sprocket',
    value: 8.0,
    stock: 87,
    status: 'Active',
  },
  {
    id: 1005,
    name: 'Stardust Filter',
    value: 25.5,
    stock: 34,
    status: 'Backordered',
  },
  {
    id: 1006,
    name: 'Cosmic Bearing',
    value: 110.0,
    stock: 4,
    status: 'Active',
  },
];
const jsonDataSource = new JSONDataSource(sampleData);

console.log(chalk.bold.yellow('\n--- 1. Basic Table ---'));
const basicFormatter = new TableFormatter(jsonDataSource);
console.log(basicFormatter.render());

console.log(
  chalk.bold.yellow('\n--- 2. Themed Table with Alternating Rows ---')
);
const themedConfig: TableConfig = {
  border: DOUBLE_LINE_BORDER,
  theme: SOLARIZED_DARK_THEME,
  alternatingRows: true,
  columns: {
    value: {
      header: 'Price',
      alignment: 'right',
      formatter: (val) => `$${Number(val).toFixed(2)}`,
    },
    stock: {
      alignment: 'right',
      // Conditional styling based on cell value
      style: { color: '#d33682' },
    },
    status: {
      formatter: (val) => (val as string).toUpperCase(),
      style: { bold: true },
    },
  },
};
const themedFormatter = new TableFormatter(jsonDataSource, themedConfig);
console.log(themedFormatter.render());

console.log(
  chalk.bold.yellow('\n--- 3. Wide Table with Truncation (maxWidth) ---')
);
const wideConfig: TableConfig = {
  ...themedConfig,
  maxWidth: 80, // Force the table to be narrower than its content
};
const wideFormatter = new TableFormatter(jsonDataSource, wideConfig);
console.log(wideFormatter.render());

console.log(
  chalk.bold.yellow('\n--- 4. Long Table with Row Limiting and Footer ---')
);
const longConfig: TableConfig = {
  ...themedConfig,
  maxWidth: undefined, // Remove width constraint
  rowLimit: 3,
  footer: (info) =>
    `Showing rows ${info.startRow + 1}-${info.endRow} of ${
      info.totalRows
    } products.`,
};
const longFormatter = new TableFormatter(jsonDataSource, longConfig);
console.log(longFormatter.render());

console.log(chalk.bold.yellow('\n--- 5. Apache Arrow Data Source Example ---'));
const arrowTable = tableFromArrays({
  flight: ['PA-224', 'UA-918', 'LH-454'],
  destination: ['Paris, France', 'Tokyo, Japan', 'Munich, Germany'],
  on_time: [true, false, true],
});
const arrowDataSource = new ArrowDataSource(arrowTable);
const arrowConfig: TableConfig = {
  border: SINGLE_LINE_BORDER,
  theme: { header: { color: 'magenta' } },
  columns: {
    on_time: {
      header: 'On Time',
      alignment: 'center',
      formatter: (val) => (val ? '✔ Yes' : '✖ No'),
    },
  },
};
const arrowFormatter = new TableFormatter(arrowDataSource, arrowConfig);
console.log(arrowFormatter.render());

console.log(chalk.bold.yellow('\n--- Dynamic Styling Example ---'));

const dynamicConfig: TableConfig = {
  alternatingRows: true,
  theme: {
    header: { color: 'yellow' },
    alternatingCell: { backgroundColor: '#222' },
  },
  // Conditionally style an entire row
  rowStyle: (row) => {
    if (row.status === 'Discontinued') {
      return { color: 'red', italic: true };
    }
    return undefined;
  },
  columns: {
    value: {
      header: 'Price',
      alignment: 'right',
      formatter: (val) => `$${Number(val).toFixed(2)}`,
    },
    stock: {
      alignment: 'right',
      // This style will be overridden by the rowStyle for the Discontinued product
      style: { color: 'cyan' },
    },
    status: {
      // Conditionally style a cell based on its value
      cellStyle: (value) => {
        if (value === 'Active') return { color: 'green' };
        if (value === 'Backordered') return { color: 'yellow' };
        // For the 'Discontinued' row, this style will be layered on top
        // of the red rowStyle, making the final text gray.
        if (value === 'Discontinued') return { color: 'gray' };
        return undefined;
      },
    },
  },
};

const dynamicFormatter = new TableFormatter(jsonDataSource, dynamicConfig);
console.log(dynamicFormatter.render());

// --- EXAMPLE 4: 2D Color Gradient ---
console.log(chalk.bold.yellow('\n--- 4. 2D Color Gradient ---'));

const rows2D = 8;
const cols2D = 40;
const gradientData: JSONObject[] = [];
// Create data where each cell's value is its own row index.
// This allows the formatter to know which row it's on.
for (let i = 0; i < rows2D; i++) {
  const row: JSONObject = {};
  for (let j = 0; j < cols2D; j++) {
    row[`c${j}`] = i; // The value is the row index
  }
  gradientData.push(row);
}
const gradientDataSource = new JSONDataSource(gradientData);

const gradientConfig: TableConfig = {
  // Use an "invisible" border for a seamless grid
  border: {
    horizontal: ' ', vertical: ' ', topLeft: ' ', topRight: ' ',
    bottomLeft: ' ', bottomRight: ' ', headerLeft: ' ', headerRight: ' ',
    topSeparator: ' ', middleSeparator: ' ', bottomSeparator: ' ', cellSeparator: ' ',
  },
  columns: {}, // We will generate this dynamically
};

// Dynamically generate the column configuration
for (let j = 0; j < cols2D; j++) {
  const hue = Math.floor((j / cols2D) * 360); // Hue changes horizontally

  gradientConfig.columns![`c${j}`] = {
    header: '',
    padding: { left: 0, right: 0 },
    // The formatter is the key. It returns a pre-styled string.
    formatter: (value) => {
      const rowIndex = value as number;
      // Lightness changes vertically from 25% to 75%
      const lightness = 25 + (rowIndex / (rows2D - 1)) * 50;
      const hexColor = hslToHex(hue, 90, lightness);
      // Return a string of two spaces with a colored background
      return chalk.bgHex(hexColor)('  ');
    },
  };
}

const gradientFormatter = new TableFormatter(gradientDataSource, gradientConfig);
console.log(gradientFormatter.render());

console.log(chalk.bold.yellow('\n--- 5. "Server Status" Dashboard ---'));

const serverData = [
  {
    name: 'web-prod-01',
    region: 'us-east-1',
    status: 'UP',
    cpu: 25.4,
    mem: 55.1,
  },
  {
    name: 'web-prod-02',
    region: 'us-east-1',
    status: 'UP',
    cpu: 33.1,
    mem: 59.8,
  },
  { name: 'db-prod-01', region: 'us-east-1', status: 'DOWN', cpu: 0, mem: 0 },
  {
    name: 'api-prod-01',
    region: 'eu-west-2',
    status: 'UP',
    cpu: 89.7,
    mem: 72.3,
  },
  {
    name: 'api-staging-01',
    region: 'eu-west-2',
    status: 'UP',
    cpu: 12.5,
    mem: 40.2,
  },
];
const serverDataSource = new JSONDataSource(serverData);

// Helper to create an ASCII progress bar
const createProgressBar = (value: number) => {
  const totalBars = 10;
  const filledBars = Math.round((value / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
};

const serverConfig: TableConfig = {
  border: {
    horizontal: '─',
    vertical: '│',
    topLeft: '╒',
    topRight: '╕',
    bottomLeft: '╘',
    bottomRight: '╛',
    headerLeft: '╞',
    headerRight: '╡',
    topSeparator: '╤',
    middleSeparator: '┼',
    bottomSeparator: '╧',
    cellSeparator: '│',
  },
  theme: { header: { color: 'cyan' } },
  rowStyle: (row) => {
    if (row.status === 'DOWN') return { backgroundColor: '#58181F' }; // Dark red background
    return undefined;
  },
  columns: {
    name: { header: 'Server Name' },
    status: {
      alignment: 'center',
      formatter: (val) => (val === 'UP' ? '✔ UP' : '✖ DOWN'),
      cellStyle: (val) => ({
        color: val === 'UP' ? 'green' : 'red',
        bold: true,
      }),
    },
    cpu: {
      header: 'CPU %',
      formatter: (val) => createProgressBar(val as number),
    },
    mem: {
      header: 'Memory %',
      formatter: (val) => createProgressBar(val as number),
    },
  },
};

const serverFormatter = new TableFormatter(serverDataSource, serverConfig);
console.log(serverFormatter.render());

console.log(chalk.bold.yellow('\n--- 6. ASCII Art Heatmap ---'));

const rows = 12;
const cols = 40;
const heatMapData: JSONObject[] = [];
// Create data where each cell's value is its own column index
for (let i = 0; i < rows; i++) {
  const row: JSONObject = {};
  for (let j = 0; j < cols; j++) {
    // Encode both row and column index into the value for the cellStyle function
    row[`c${j}`] = { row: i, col: j } as { row: number; col: number };
  }
  heatMapData.push(row);
}
const heatMapSource = new JSONDataSource(heatMapData);

const heatMapConfig: TableConfig = {
  border: {
    horizontal: ' ',
    vertical: ' ',
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    headerLeft: ' ',
    headerRight: ' ',
    topSeparator: ' ',
    middleSeparator: ' ',
    bottomSeparator: ' ',
    cellSeparator: '',
  },
  columns: {}, // Generated dynamically
};

// Dynamically generate the column configuration
for (let j = 0; j < cols; j++) {
  heatMapConfig.columns![`c${j}`] = {
    header: '',
    padding: { left: 0, right: 0 },
    formatter: () => '██',
    cellStyle: (value) => {
      const { row, col } = value as unknown as { row: number; col: number };
      const hue =
        Math.sin((row / rows) * Math.PI) * 180 +
        Math.cos((col / cols) * Math.PI) * 180;
      const lightness = 25 + Math.sin((col / cols) * Math.PI * 2) * 10;

      return { color: hslToHex(hue, 90, lightness) };
    },
  };
}

const heatMapFormatter = new TableFormatter(heatMapSource, heatMapConfig);
console.log(heatMapFormatter.render());

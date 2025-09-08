import {
  TableFormatter,
} from './src/TableFormatter';
import { JSONDataSource } from './src/JSONDataSource';
import { TableConfig, JSONObject } from './src/types';
import chalk from 'chalk';

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

console.log(chalk.bold.yellow('\n--- 5. "Matrix" Digital Rain Animation ---'));
console.log('Starting animation... Press Ctrl+C to exit.');

setTimeout(() => {
  const rainRows = 25; // A bit taller for a better effect
  const rainCols = 80; // Wider to fill more of the screen

  interface RainDrop {
    col: number;
    y: number;
    length: number;
    speed: number;
  }

  let activeDrops: RainDrop[] = [];

  const rainChars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*()_+-=[]{}|;:,.<>?';
  const getRandomChar = () =>
    rainChars[Math.floor(Math.random() * rainChars.length)];

  const updateAndRenderRain = () => {
    const grid: (string | null)[][] = Array(rainRows)
      .fill(null)
      .map(() => Array(rainCols).fill(null));

    activeDrops.forEach((drop) => {
      drop.y += drop.speed;

      for (let i = 0; i < drop.length; i++) {
        const charRow = Math.floor(drop.y - i);
        if (charRow >= 0 && charRow < rainRows) {
          const char = getRandomChar();

          if (i === 0) {
            grid[charRow][drop.col] = chalk.whiteBright(char);
          } else {
            const lightness = 60 - i * (55 / drop.length); // Fade from 60% to 5% lightness
            if (lightness > 0) {
              const hex = hslToHex(120, 90, lightness); // Pure green hue (120)
              grid[charRow][drop.col] = chalk.hex(hex)(char);
            }
          }
        }
      }
    });

    activeDrops = activeDrops.filter((drop) => drop.y - drop.length < rainRows);

    // Add new drops more frequently to keep the screen active
    if (Math.random() > 0.2) {
      activeDrops.push({
        col: Math.floor(Math.random() * rainCols),
        y: -1,
        length: Math.floor(6 + Math.random() * (rainRows * 0.8)),
        speed: 0.4 + Math.random() * 0.4,
      });
    }

    const rainData: JSONObject[] = grid.map((row) => {
      const rowObj: JSONObject = {};
      row.forEach((cell, colIndex) => {
        rowObj[`c${colIndex}`] = cell ?? ' ';
      });
      return rowObj;
    });

    const rainDataSource = new JSONDataSource(rainData);

    const rainConfig: TableConfig = {
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
      columns: {},
    };

    for (let j = 0; j < rainCols; j++) {
      rainConfig.columns![`c${j}`] = {
        header: '',
        padding: { left: 0, right: 0 },
        formatter: (val) => val as string,
      };
    }

    const rainFormatter = new TableFormatter(rainDataSource, rainConfig);

    console.clear();
    process.stdout.write(rainFormatter.render()); // Use process.stdout.write for smoother animation
  };

  // Start the animation loop, updating every 80 milliseconds for a faster, smoother feel
  setInterval(updateAndRenderRain, 50);
}, 1000);
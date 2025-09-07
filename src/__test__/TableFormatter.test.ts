import { describe, it, expect, beforeEach } from 'vitest';
import { TableFormatter } from '../TableFormatter';
import { JSONDataSource, JSONObject } from '../JSONDataSource';
import chalk from 'chalk';

describe('TableFormatter', () => {
  // Disable color for snapshot consistency, but manage it per-test
  beforeEach(() => {
    chalk.level = 0;
  });

  const sampleData: JSONObject[] = [
    {
      id: 1,
      name: 'A very long item name that will need truncation',
      price: 12.99,
    },
    { id: 2, name: 'Short name', price: 5.0 },
  ];
  const source = new JSONDataSource(sampleData);

  it('should render a basic table correctly', () => {
    const formatter = new TableFormatter(source);
    expect(formatter.render()).toMatchSnapshot();
  });

  it('should handle rowLimit and rowOffset', () => {
    const formatter = new TableFormatter(source, { rowLimit: 1, rowOffset: 1 });
    const output = formatter.render();
    expect(output).toContain('Short name');
    expect(output).not.toContain('A very long item name');
    expect(output).toMatchSnapshot();
  });

  it('should apply custom formatters', () => {
    const formatter = new TableFormatter(source, {
      columns: {
        price: {
          formatter: (val) => `$${Number(val).toFixed(2)}`,
        },
      },
    });
    expect(formatter.render()).toContain('$12.99');
  });

  it('should align text correctly', () => {
    const formatter = new TableFormatter(source, {
      columns: {
        id: { alignment: 'center' },
        price: { alignment: 'right' },
      },
    });
    expect(formatter.render()).toMatchSnapshot();
  });

  it('should truncate text when maxWidth is exceeded', () => {
    const formatter = new TableFormatter(source, { maxWidth: 40 });
    const output = formatter.render();
    output.split('\n').forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(40);
    });
    expect(output).toContain('…');
    expect(output).toMatchSnapshot();
  });

  it('should apply styles (tested by checking for ANSI codes)', () => {
    // Re-enable color for this specific test
    chalk.level = 1;
    const formatter = new TableFormatter(source, {
      header: { color: 'cyan', bold: true },
      columns: { name: { style: { italic: true } } },
    });
    const output = formatter.render();

    expect(output).toContain('\u001b[36m'); // ANSI code for cyan
    expect(output).toContain('\u001b[1m'); // ANSI code for bold
    expect(output).toContain('\u001b[3m'); // ANSI code for italic
  });

  it('should render a custom footer', () => {
    const formatter = new TableFormatter(source, {
      footer: (info) => `Displayed ${info.displayedRows} of ${info.totalRows}.`,
    });
    expect(formatter.render()).toContain('Displayed 2 of 2.');
  });
});

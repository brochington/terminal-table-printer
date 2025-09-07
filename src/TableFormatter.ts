import { ITableDataSource } from './ITableDataSource';
import { TableConfig, Style, BorderChars, FooterInfo } from './types';
import chalk from 'chalk';
import stringWidth from 'string-width';

export const SINGLE_LINE_BORDER: BorderChars = {
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  headerLeft: '├',
  headerRight: '┤',
  topSeparator: '┬',
  middleSeparator: '┼',
  bottomSeparator: '┴',
  cellSeparator: '│',
};

export const DOUBLE_LINE_BORDER: BorderChars = {
  horizontal: '═',
  vertical: '║',
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  headerLeft: '╠',
  headerRight: '╣',
  topSeparator: '╦',
  middleSeparator: '╬',
  bottomSeparator: '╩',
  cellSeparator: '║',
};

// --- Default Settings ---
const DEFAULT_PADDING = { left: 1, right: 1 };
const DEFAULT_TRUNCATION_CHAR = '…';
const DEFAULT_BORDER: BorderChars = SINGLE_LINE_BORDER;

/**
 * Renders a data source into a styled, formatted text table with support for resizing.
 */
export class TableFormatter {
  private readonly source: ITableDataSource;
  private readonly config: TableConfig;
  private readonly borderChars: BorderChars;

  constructor(source: ITableDataSource, config: TableConfig = {}) {
    this.source = source;
    this.config = config;
    this.borderChars = { ...DEFAULT_BORDER, ...config.border };
  }

  private applyStyle(text: string, style: Style = {}): string {
    let styledText = text;
    if (style.color) {
      styledText = chalk[style.color](styledText);
    }
    if (style.backgroundColor) {
      styledText = chalk[style.backgroundColor](styledText);
    }
    if (style.bold) {
      styledText = chalk.bold(styledText);
    }
    if (style.italic) {
      styledText = chalk.italic(styledText);
    }
    if (style.underline) {
      styledText = chalk.underline(styledText);
    }
    return styledText;
  }

  public render(): string {
    const columnNames = this.source.getColumnNames();
    if (columnNames.length === 0) {
      return this.applyStyle('(No data)', this.config.cell);
    }

    const totalRows = this.source.getRowCount();
    const rowOffset = this.config.rowOffset ?? 0;
    const rowLimit = this.config.rowLimit ?? totalRows;
    const startRow = Math.max(0, rowOffset);
    const endRow = Math.min(totalRows, startRow + rowLimit);
    const formattedDataWindow: string[][] = [];
    for (let i = startRow; i < endRow; i++) {
      const row = this.source.getArrayRow(i);
      formattedDataWindow.push(
        row.map((cell, colIdx) => {
          const colName = columnNames[colIdx];
          const formatter = this.config.columns?.[colName]?.formatter;
          return formatter ? formatter(cell) : String(cell ?? '');
        })
      );
    }

    const headerLabels = columnNames.map(
      (name) => this.config.columns?.[name]?.header ?? name
    );

    const idealWidths = this.calculateColumnWidths(
      headerLabels,
      formattedDataWindow
    );
    const finalWidths = this.distributeWidths(idealWidths);
    const output: string[] = [];

    // --- Render Header ---
    output.push(
      this.renderSeparator(
        finalWidths,
        'topLeft',
        'topSeparator',
        'topRight',
        'horizontal'
      )
    );
    output.push(this.renderHeader(headerLabels, finalWidths));

    // Use 'middleSeparator' for the line under the header (e.g., ┼ or ╬)
    output.push(
      this.renderSeparator(
        finalWidths,
        'headerLeft',
        'middleSeparator',
        'headerRight',
        'horizontal'
      )
    );

    // --- Render Data Rows ---
    if (formattedDataWindow.length === 0) {
      output.push(
        this.renderRow(
          columnNames.map(() => ''),
          finalWidths
        )
      );
    } else {
      formattedDataWindow.forEach((row) => {
        output.push(this.renderRow(row, finalWidths));
      });
    }

    // --- Render Footer (if configured) ---
    if (this.config.footer) {
      // Use 'bottomSeparator' for the line above the footer (e.g., ┴ or ╩)
      output.push(
        this.renderSeparator(
          finalWidths,
          'headerLeft',
          'bottomSeparator',
          'headerRight',
          'horizontal'
        )
      );

      const footerInfo: FooterInfo = {
        totalRows,
        displayedRows: endRow - startRow,
        isTruncated: totalRows > rowLimit,
        startRow,
        endRow,
      };

      const footerText = this.config.footer(footerInfo);

      const padding = this.config.padding ?? DEFAULT_PADDING;
      const totalContentWidth = finalWidths.reduce((a, b) => a + b, 0);
      const totalPadding = (padding.left + padding.right) * finalWidths.length;
      const innerBorderWidth =
        finalWidths.length > 1 ? finalWidths.length - 1 : 0;
      const totalInnerWidth =
        totalContentWidth + totalPadding + innerBorderWidth;

      const content = ' ' + footerText;
      const paddedFooter = content.padEnd(totalInnerWidth, ' ');
      const { vertical } = this.borderChars;
      output.push(`${vertical}${paddedFooter}${vertical}`);

      // Render a solid bottom line for the footer
      const solidLine = this.borderChars.horizontal.repeat(totalInnerWidth);
      output.push(
        `${this.borderChars.bottomLeft}${solidLine}${this.borderChars.bottomRight}`
      );
    } else {
      // If no footer, render a normal bottom border
      output.push(
        this.renderSeparator(
          finalWidths,
          'bottomLeft',
          'bottomSeparator',
          'bottomRight',
          'horizontal'
        )
      );
    }

    return output.join('\n');
  }

  private calculateColumnWidths(
    headers: string[],
    dataWindow: string[][]
  ): number[] {
    const widths = headers.map((h) => stringWidth(h));
    for (const row of dataWindow) {
      for (let i = 0; i < row.length; i++) {
        const cellWidth = stringWidth(row[i]);
        if (cellWidth > (widths[i] ?? 0)) {
          widths[i] = cellWidth;
        }
      }
    }
    return widths;
  }

  private distributeWidths(idealWidths: number[]): number[] {
    const { maxWidth } = this.config;
    if (!maxWidth) {
      return idealWidths;
    }

    const padding = this.config.padding ?? DEFAULT_PADDING;
    const totalPadding = padding.left + padding.right;
    const borderOverhead = idealWidths.length + 1;

    let totalWidth = idealWidths.reduce(
      (sum, w) => sum + w + totalPadding,
      borderOverhead
    );
    if (totalWidth <= maxWidth) {
      return idealWidths;
    }

    const finalWidths = [...idealWidths];
    let excessWidth = totalWidth - maxWidth;

    const shrinkable = finalWidths
      .map((width, index) => ({ width, index }))
      .sort((a, b) => b.width - a.width);

    while (excessWidth > 0 && shrinkable.length > 0) {
      let shrunkInCycle = false;
      for (const col of shrinkable) {
        const minWidth = stringWidth(
          this.config.truncationChar ?? DEFAULT_TRUNCATION_CHAR
        );
        if (finalWidths[col.index] > minWidth) {
          finalWidths[col.index]--;
          excessWidth--;
          shrunkInCycle = true;
          if (excessWidth === 0) break;
        }
      }
      if (!shrunkInCycle) break;
    }
    return finalWidths;
  }

  private renderHeader(headers: string[], widths: number[]): string {
    const columnNames = this.source.getColumnNames();
    const cells = headers.map((header, i) => {
      const colName = columnNames[i];
      const columnConfig = this.config.columns?.[colName];
      const style = columnConfig?.headerStyle ?? this.config.header;
      const alignedHeader = this.alignAndTruncateText(
        header,
        widths[i],
        columnConfig?.alignment ?? 'left'
      );
      return this.applyStyle(alignedHeader, style);
    });
    const { vertical } = this.borderChars;
    return `${vertical}${cells.join(vertical)}${vertical}`;
  }

  // FIX #1: The unused 'rowIndex' parameter has been removed from the signature.
  private renderRow(rowCells: string[], widths: number[]): string {
    const columnNames = this.source.getColumnNames();
    const cells = rowCells.map((cell, i) => {
      const colName = columnNames[i];
      const columnConfig = this.config.columns?.[colName];
      const style = columnConfig?.style ?? this.config.cell;
      const alignedCell = this.alignAndTruncateText(
        cell,
        widths[i],
        columnConfig?.alignment ?? 'left'
      );
      return this.applyStyle(alignedCell, style);
    });
    const { vertical, cellSeparator } = this.borderChars;
    return `${vertical}${cells.join(cellSeparator)}${vertical}`;
  }

  private alignAndTruncateText(
    text: string,
    width: number,
    alignment: 'left' | 'right' | 'center'
  ): string {
    const padding = this.config.padding ?? DEFAULT_PADDING;
    const truncationChar =
      this.config.truncationChar ?? DEFAULT_TRUNCATION_CHAR;
    const truncationWidth = stringWidth(truncationChar);

    let truncatedText = text;
    if (stringWidth(text) > width) {
      if (width >= truncationWidth) {
        // FIX #2: Replaced the 'for...of' loop with a 'while' loop that doesn't have an unused variable.
        let newLength = 0;
        while (
          newLength < text.length &&
          stringWidth(text.substring(0, newLength + 1)) <=
            width - truncationWidth
        ) {
          newLength++;
        }
        truncatedText = text.substring(0, newLength) + truncationChar;
      } else {
        let clipped = '';
        // This loop is correct because 'char' is used.
        for (const char of truncationChar) {
          if (stringWidth(clipped + char) > width) break;
          clipped += char;
        }
        truncatedText = clipped;
      }
    }

    const textWidth = stringWidth(truncatedText);
    const totalPadding = padding.left + padding.right;
    const totalWidth = width + totalPadding;

    switch (alignment) {
      case 'right':
        return (
          ' '.repeat(totalWidth - textWidth - padding.right) +
          truncatedText +
          ' '.repeat(padding.right)
        );
      case 'center':
        const padLeft = Math.floor((totalWidth - textWidth) / 2);
        const padRight = totalWidth - textWidth - padLeft;
        return ' '.repeat(padLeft) + truncatedText + ' '.repeat(padRight);
      case 'left':
      default:
        return (
          ' '.repeat(padding.left) +
          truncatedText +
          ' '.repeat(totalWidth - textWidth - padding.left)
        );
    }
  }

  private renderSeparator(
    widths: number[],
    leftKey: keyof BorderChars,
    middleKey: keyof BorderChars,
    rightKey: keyof BorderChars,
    lineKey: keyof BorderChars
  ): string {
    const padding = this.config.padding ?? DEFAULT_PADDING;
    const totalPadding = padding.left + padding.right;
    const line = this.borderChars[lineKey];
    const parts = widths.map((w) => line.repeat(w + totalPadding));
    const left = this.borderChars[leftKey];
    const middle = this.borderChars[middleKey];
    const right = this.borderChars[rightKey];
    return `${left}${parts.join(middle)}${right}`;
  }
}

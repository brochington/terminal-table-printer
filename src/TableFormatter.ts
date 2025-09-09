import type { ITableDataSource } from "./ITableDataSource";
import type {
	TableConfig,
	Style,
	BorderChars,
	FooterInfo,
	TableTheme,
	JSONObject,
} from "./types";
import chalk, {
	type BackgroundColorName,
	type ForegroundColorName,
} from "chalk";
import stringWidth from "string-width";

export const SINGLE_LINE_BORDER: BorderChars = {
	horizontal: "─",
	vertical: "│",
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
	headerLeft: "├",
	headerRight: "┤",
	topSeparator: "┬",
	middleSeparator: "┼",
	bottomSeparator: "┴",
	cellSeparator: "│",
};

export const DOUBLE_LINE_BORDER: BorderChars = {
	horizontal: "═",
	vertical: "║",
	topLeft: "╔",
	topRight: "╗",
	bottomLeft: "╚",
	bottomRight: "╝",
	headerLeft: "╠",
	headerRight: "╣",
	topSeparator: "╦",
	middleSeparator: "╬",
	bottomSeparator: "╩",
	cellSeparator: "║",
};

export const CHALK_COLOR_NAMES: ForegroundColorName[] = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"gray",
	"grey",
	"blackBright",
	"redBright",
	"greenBright",
	"yellowBright",
	"blueBright",
	"magentaBright",
	"cyanBright",
	"whiteBright",
];

export const CHALK_BACKGROUND_COLORS: Record<
	ForegroundColorName,
	BackgroundColorName
> = {
	black: "bgBlack",
	red: "bgRed",
	green: "bgGreen",
	yellow: "bgYellow",
	blue: "bgBlue",
	magenta: "bgMagenta",
	cyan: "bgCyan",
	white: "bgWhite",
	gray: "bgGray",
	grey: "bgGrey",
	blackBright: "bgBlackBright",
	redBright: "bgRedBright",
	greenBright: "bgGreenBright",
	yellowBright: "bgYellowBright",
	blueBright: "bgBlueBright",
	magentaBright: "bgMagentaBright",
	cyanBright: "bgCyanBright",
	whiteBright: "bgWhiteBright",
};

export const CHALK_BACKGROUND_COLOR_NAMES: BackgroundColorName[] =
	Object.values(CHALK_BACKGROUND_COLORS);

// --- Default Settings ---
const DEFAULT_PADDING = { left: 1, right: 1 };
const DEFAULT_TRUNCATION_CHAR = "…";
const DEFAULT_BORDER: BorderChars = SINGLE_LINE_BORDER;

const DEFAULT_THEME: TableTheme = {
	header: { bold: true },
	cell: {},
	alternatingCell: { color: "gray" },
	footer: { color: "gray" },
};

/**
 * Renders a data source into a styled, formatted text table with support for resizing.
 */
export class TableFormatter {
	private readonly source: ITableDataSource;
	private readonly config: TableConfig;
	private readonly borderChars: BorderChars;
	private readonly theme: TableTheme;

	constructor(source: ITableDataSource, config: TableConfig = {}) {
		this.source = source;
		this.config = config;
		this.borderChars = { ...DEFAULT_BORDER, ...config.border };
		this.theme = {
			...DEFAULT_THEME,
			...config.theme,
			// Deep merge nested style objects
			header: { ...DEFAULT_THEME.header, ...config.theme?.header },
			cell: { ...DEFAULT_THEME.cell, ...config.theme?.cell },
			alternatingCell: {
				...DEFAULT_THEME.alternatingCell,
				...config.theme?.alternatingCell,
			},
			footer: { ...DEFAULT_THEME.footer, ...config.theme?.footer },
		};
	}

	/**
	 * Applies a style object to a string using chalk.
	 * Supports basic color names and hex codes.
	 */
	private applyStyle(text: string, style: Style = {}): string {
		// If the text is already styled (from a formatter), don't apply more styles.
		if (text.includes("\u001b[")) {
			return text;
		}

		let styler = chalk;
		if (style.color) {
			if (style.color.startsWith("#")) {
				styler = styler.hex(style.color);
			} else {
				if (CHALK_COLOR_NAMES.includes(style.color as ForegroundColorName)) {
					styler = styler[style.color as ForegroundColorName];
				}
			}
		}
		if (style.backgroundColor) {
			if (style.backgroundColor.startsWith("#")) {
				styler = styler.bgHex(style.backgroundColor);
			} else {
				if (
					CHALK_BACKGROUND_COLOR_NAMES.includes(
						style.backgroundColor as BackgroundColorName,
					)
				) {
					styler = styler[style.backgroundColor as BackgroundColorName];
				} else {
					if (
						CHALK_BACKGROUND_COLORS[
							style.backgroundColor as ForegroundColorName
						]
					) {
						styler =
							styler[
								CHALK_BACKGROUND_COLORS[
									style.backgroundColor as ForegroundColorName
								]
							];
					}
				}
			}
		}
		if (style.bold) styler = styler.bold;
		if (style.italic) styler = styler.italic;
		if (style.underline) styler = styler.underline;
		return styler(text);
	}

	public render(): string {
		// 1. Determine available width. Use configured maxWidth, else terminal width, else 80.
		const availableWidth = this.config.maxWidth ?? process.stdout.columns ?? 80;

		const columnNames = this.source.getColumnNames();
		if (columnNames.length === 0) {
			return this.applyStyle("(No data)", this.theme.cell);
		}

		// 2. Paginate data by getting the subset of rows to be displayed.
		const totalRows = this.source.getRowCount();
		const rowOffset = this.config.rowOffset ?? 0;
		const rowLimit = this.config.rowLimit ?? totalRows;
		const startRow = Math.max(0, rowOffset);
		const endRow = Math.min(totalRows, startRow + rowLimit);

		// 3. Format the data window by applying per-column formatters.
		const formattedDataWindow: string[][] = [];
		for (let i = startRow; i < endRow; i++) {
			const row = this.source.getArrayRow(i);
			formattedDataWindow.push(
				row.map((cell, colIdx) => {
					const colName = columnNames[colIdx];
					const formatter = this.config.columns?.[colName]?.formatter;
					if (formatter) {
						return formatter(cell, i);
					}
					if (typeof cell === "object" && cell !== null) {
						return JSON.stringify(cell);
					}
					return String(cell ?? "");
				}),
			);
		}

		const headerLabels = columnNames.map(
			(name) => this.config.columns?.[name]?.header ?? name,
		);

		// 4. Calculate final column widths based on content and available space.
		const idealWidths = this.calculateColumnWidths(
			headerLabels,
			formattedDataWindow,
		);
		const finalWidths = this.distributeWidths(idealWidths, availableWidth);

		const output: string[] = [];

		// 5. Calculate the total inner width, which is essential for the footer.
		// This respects per-column padding overrides.
		const totalContentWidth = finalWidths.reduce((a, b) => a + b, 0);
		let totalPadding = 0;
		for (let i = 0; i < finalWidths.length; i++) {
			const colName = columnNames[i];
			const colPadding =
				this.config.columns?.[colName]?.padding ??
				this.config.padding ??
				DEFAULT_PADDING;
			totalPadding += colPadding.left + colPadding.right;
		}
		const innerBorderWidth =
			finalWidths.length > 1 ? finalWidths.length - 1 : 0;
		const totalInnerWidth = totalContentWidth + totalPadding + innerBorderWidth;

		// 6. Render the top border, header, and header separator.
		output.push(
			this.renderSeparator(
				finalWidths,
				"topLeft",
				"topSeparator",
				"topRight",
				"horizontal",
			),
		);
		output.push(this.renderHeader(headerLabels, finalWidths));
		output.push(
			this.renderSeparator(
				finalWidths,
				"headerLeft",
				"middleSeparator",
				"headerRight",
				"horizontal",
			),
		);

		// 7. Render the data rows.
		if (formattedDataWindow.length === 0) {
			const emptyRowContent = columnNames.map(() => "");
			const emptyRowObject = columnNames.reduce(
				(acc, name) => ({ ...acc, [name]: null }),
				{},
			);
			output.push(
				this.renderRow(emptyRowContent, emptyRowObject, finalWidths, 0),
			);
		} else {
			formattedDataWindow.forEach((row, i) => {
				const originalRow = this.source.getObjectRow(startRow + i);
				output.push(
					this.renderRow(row, originalRow, finalWidths, startRow + i),
				);
			});
		}

		// 8. Render the footer (if configured) or the final bottom border.
		// This block contains the specific logic to match your desired output.
		if (this.config.footer) {
			// Render the separator line that closes the table body.
			// It uses bottom junction characters (e.g., '╩') to meet the column lines.
			output.push(
				this.renderSeparator(
					finalWidths,
					"headerLeft", // e.g., '╠'
					"bottomSeparator", // e.g., '╩'
					"headerRight", // e.g., '╣'
					"horizontal",
				),
			);

			// Prepare the footer text as a single, wide cell.
			const footerInfo: FooterInfo = {
				totalRows,
				displayedRows: endRow - startRow,
				isTruncated: totalRows > rowLimit,
				startRow,
				endRow,
			};
			const footerText = this.config.footer(footerInfo);
			const { vertical, bottomLeft, bottomRight, horizontal } =
				this.borderChars;

			// Pad the content to span the entire calculated inner width of the table.
			const content = ` ${footerText}`;
			const paddedFooter = this.applyStyle(
				content.padEnd(totalInnerWidth, " "),
				this.theme.footer,
			);

			// Render the footer text row, enclosed by vertical walls.
			output.push(`${vertical}${paddedFooter}${vertical}`);

			// Render the final, solid bottom line with no column junctions.
			const solidLine = horizontal.repeat(totalInnerWidth);
			output.push(`${bottomLeft}${solidLine}${bottomRight}`);
		} else {
			// If no footer, render the standard closing border with column junctions.
			output.push(
				this.renderSeparator(
					finalWidths,
					"bottomLeft",
					"bottomSeparator",
					"bottomRight",
					"horizontal",
				),
			);
		}

		return output.join("\n");
	}

	private calculateColumnWidths(
		headers: string[],
		dataWindow: string[][],
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

	private distributeWidths(
		idealWidths: number[],
		availableWidth: number,
	): number[] {
		const columnNames = this.source.getColumnNames();
		const finalWidths = [...idealWidths];

		const borderOverhead = finalWidths.length + 1;
		let totalPadding = 0;
		for (let i = 0; i < idealWidths.length; i++) {
			const colName = columnNames[i];
			const padding =
				this.config.columns?.[colName]?.padding ??
				this.config.padding ??
				DEFAULT_PADDING;
			totalPadding += padding.left + padding.right;
		}

		const contentWidth = availableWidth - borderOverhead - totalPadding;

		// 1. Apply minWidth and maxWidth constraints
		let totalConstrainedWidth = 0;
		const flexColumns: number[] = [];
		let totalFlexGrow = 0;

		for (let i = 0; i < finalWidths.length; i++) {
			const colName = columnNames[i];
			const colConfig = this.config.columns?.[colName];

			const min = colConfig?.minWidth ?? 1;
			const max = colConfig?.maxWidth ?? Infinity;

			finalWidths[i] = Math.max(min, Math.min(finalWidths[i], max));
			totalConstrainedWidth += finalWidths[i];

			if (colConfig?.flexGrow) {
				totalFlexGrow += colConfig.flexGrow;
				flexColumns.push(i);
			}
		}

		// --- Start of Corrected Growth Phase ---

		// 2. Growth Phase (Iterative): Distribute remaining space to flex columns.
		let remainingSpace = contentWidth - totalConstrainedWidth;
		// Keep looping as long as there is space and potential for growth.
		while (remainingSpace > 0 && flexColumns.length > 0) {
			// Find columns that can still grow (haven't hit their maxWidth).
			const growableColumns = flexColumns.filter((i) => {
				const max = this.config.columns?.[columnNames[i]]?.maxWidth ?? Infinity;
				return finalWidths[i] < max;
			});

			if (growableColumns.length === 0) break; // No columns can grow further.

			// Calculate the total flex factor of only the columns that can still grow.
			const totalGrowableFlex = growableColumns.reduce((sum, i) => {
				return sum + (this.config.columns?.[columnNames[i]]?.flexGrow ?? 0);
			}, 0);

			if (totalGrowableFlex === 0) break; // No flex factor left.

			let spaceDistributedInCycle = 0;
			const spaceToDistribute = remainingSpace;

			for (const i of growableColumns) {
				const colConfig = this.config.columns?.[columnNames[i]];
				const flexGrow = colConfig?.flexGrow ?? 0;
				const max = colConfig?.maxWidth ?? Infinity;

				// Calculate this column's share of the *currently available* space.
				const share = Math.floor(
					spaceToDistribute * (flexGrow / totalGrowableFlex),
				);

				// The actual growth is the smaller of its share or the room it has left.
				const growth = Math.min(share, max - finalWidths[i]);

				if (growth > 0) {
					finalWidths[i] += growth;
					spaceDistributedInCycle += growth;
				}
			}

			// If we distributed no space (due to rounding on small numbers), exit to prevent an infinite loop.
			if (spaceDistributedInCycle === 0) break;

			remainingSpace -= spaceDistributedInCycle;
			totalConstrainedWidth += spaceDistributedInCycle;
		}

		// --- End of Corrected Growth Phase ---

		// 3. Shrink Phase: If we're still over budget, shrink columns.
		let excessWidth = totalConstrainedWidth - contentWidth;
		if (excessWidth > 0) {
			const shrinkable = finalWidths
				.map((width, index) => {
					const colName = columnNames[index];
					const minWidth = this.config.columns?.[colName]?.minWidth ?? 1;
					return {
						index,
						width,
						canShrinkBy: width - minWidth,
					};
				})
				.filter((c) => c.canShrinkBy > 0)
				.sort((a, b) => b.width - a.width);

			while (excessWidth > 0 && shrinkable.length > 0) {
				let shrunkInCycle = false;
				for (const col of shrinkable) {
					if (col.canShrinkBy > 0) {
						finalWidths[col.index]--;
						col.canShrinkBy--;
						excessWidth--;
						shrunkInCycle = true;
						if (excessWidth === 0) break;
					}
				}
				if (!shrunkInCycle) break;
			}
		}

		return finalWidths;
	}

	private renderHeader(headers: string[], widths: number[]): string {
		const columnNames = this.source.getColumnNames();
		const cells = headers.map((header, i) => {
			const colName = columnNames[i];
			const columnConfig = this.config.columns?.[colName];
			const style = { ...this.theme.header, ...columnConfig?.headerStyle };
			const alignedHeader = this.alignAndTruncateText(
				header,
				widths[i],
				columnConfig?.alignment ?? "left",
				i,
			);

			// Only apply style if the header isn't empty, to prevent styling the padding.
			if (alignedHeader.trim() === "") {
				return alignedHeader;
			}

			return this.applyStyle(alignedHeader, style);
		});
		const { vertical } = this.borderChars;
		return `${vertical}${cells.join(vertical)}${vertical}`;
	}

	private renderRow(
		rowCells: string[],
		originalRow: JSONObject,
		widths: number[],
		rowIndex: number,
	): string {
		const columnNames = this.source.getColumnNames();

		// --- Style Precedence Logic ---

		// 1. Determine the base style for the entire row (cell or alternating)
		const isAlternating = this.config.alternatingRows && rowIndex % 2 !== 0;
		const baseRowStyle = isAlternating
			? this.theme.alternatingCell
			: this.theme.cell;

		// 2. Get the conditional style for the entire row
		const conditionalRowStyle = this.config.rowStyle?.(originalRow) ?? {};

		// 3. Merge them: conditionalRowStyle properties override baseRowStyle
		const mergedRowStyle = { ...baseRowStyle, ...conditionalRowStyle };

		const cells = rowCells.map((cell, i) => {
			const colName = columnNames[i];
			const columnConfig = this.config.columns?.[colName];
			const originalValue = originalRow[colName];

			// 4. Start with the calculated style for the row
			let finalStyle = mergedRowStyle;

			// 5. Apply static column style
			const staticColumnStyle = columnConfig?.style ?? {};
			finalStyle = { ...finalStyle, ...staticColumnStyle };

			// 6. Apply conditional cell style (most specific)
			const conditionalCellStyle =
				columnConfig?.cellStyle?.(originalValue) ?? {};
			finalStyle = { ...finalStyle, ...conditionalCellStyle };

			const alignedCell = this.alignAndTruncateText(
				cell,
				widths[i],
				columnConfig?.alignment ?? "left",
				i,
			);
			return this.applyStyle(alignedCell, finalStyle);
		});
		const { vertical, cellSeparator } = this.borderChars;
		return `${vertical}${cells.join(cellSeparator)}${vertical}`;
	}

	private alignAndTruncateText(
		text: string,
		width: number,
		alignment: "left" | "right" | "center",
		columnIndex: number,
	): string {
		const columnNames = this.source.getColumnNames();
		const colName = columnNames[columnIndex];
		const padding =
			this.config.columns?.[colName]?.padding ??
			this.config.padding ??
			DEFAULT_PADDING;
		const truncationChar =
			this.config.truncationChar ?? DEFAULT_TRUNCATION_CHAR;
		const truncationWidth = stringWidth(truncationChar);

		let truncatedText = text;
		if (stringWidth(text) > width) {
			if (width >= truncationWidth) {
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
				let clipped = "";
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
			case "right":
				return (
					" ".repeat(totalWidth - textWidth - padding.right) +
					truncatedText +
					" ".repeat(padding.right)
				);
			case "center": {
				const padLeft = Math.floor((totalWidth - textWidth) / 2);
				const padRight = totalWidth - textWidth - padLeft;
				return " ".repeat(padLeft) + truncatedText + " ".repeat(padRight);
			}
			case "left":
			default:
				return (
					" ".repeat(padding.left) +
					truncatedText +
					" ".repeat(totalWidth - textWidth - padding.left)
				);
		}
	}

	private renderSeparator(
		widths: number[],
		leftKey: keyof BorderChars,
		middleKey: keyof BorderChars,
		rightKey: keyof BorderChars,
		lineKey: keyof BorderChars,
	): string {
		const columnNames = this.source.getColumnNames();
		const line = this.borderChars[lineKey];

		const parts = widths.map((w, i) => {
			const colName = columnNames[i];
			const padding =
				this.config.columns?.[colName]?.padding ??
				this.config.padding ??
				DEFAULT_PADDING;
			const totalPadding = padding.left + padding.right;
			return line.repeat(w + totalPadding);
		});
		const left = this.borderChars[leftKey];
		const middle = this.borderChars[middleKey];
		const right = this.borderChars[rightKey];
		return `${left}${parts.join(middle)}${right}`;
	}
}

import { describe, it, expect, beforeEach } from "vitest";
import { TableFormatter } from "../TableFormatter";
import { JSONDataSource, JSONObject } from "../JSONDataSource";
import chalk from "chalk";
import { TableTheme } from "../types";

describe("TableFormatter", () => {
	// Disable color for snapshot consistency, but manage it per-test
	beforeEach(() => {
		chalk.level = 0;
	});

	const sampleData: JSONObject[] = [
		{
			id: 1,
			name: "A very long item name that will need truncation",
			price: 12.99,
		},
		{ id: 2, name: "Short name", price: 5.0 },
	];
	const source = new JSONDataSource(sampleData);

	// --- Basic Functionality Tests ---

	it("should render a basic table correctly", () => {
		const formatter = new TableFormatter(source);
		expect(formatter.render()).toMatchSnapshot();
	});

	it("should handle rowLimit and rowOffset", () => {
		const formatter = new TableFormatter(source, { rowLimit: 1, rowOffset: 1 });
		const output = formatter.render();
		expect(output).toContain("Short name");
		expect(output).not.toContain("A very long item name");
		expect(output).toMatchSnapshot();
	});

	it("should apply custom formatters", () => {
		const formatter = new TableFormatter(source, {
			columns: {
				price: {
					formatter: (val) => `$${Number(val).toFixed(2)}`,
				},
			},
		});
		expect(formatter.render()).toContain("$12.99");
	});

	it("should align text correctly", () => {
		const formatter = new TableFormatter(source, {
			columns: {
				id: { alignment: "center" },
				price: { alignment: "right" },
			},
		});
		expect(formatter.render()).toMatchSnapshot();
	});

	it("should truncate text when maxWidth is exceeded", () => {
		const formatter = new TableFormatter(source, { maxWidth: 40 });
		const output = formatter.render();
		output.split("\n").forEach((line) => {
			expect(line.length).toBeLessThanOrEqual(40);
		});
		expect(output).toContain("…");
		expect(output).toMatchSnapshot();
	});

	it("should render a custom footer", () => {
		const formatter = new TableFormatter(source, {
			footer: (info) => `Displayed ${info.displayedRows} of ${info.totalRows}.`,
		});
		expect(formatter.render()).toContain("Displayed 2 of 2.");
	});

	// --- Theming and Styling Tests ---

	describe("Theming and Styling", () => {
		const themeData = [
			{ id: 1, item: "Row 1" },
			{ id: 2, item: "Row 2" },
			{ id: 3, item: "Row 3" },
			{ id: 4, item: "Row 4" },
		];
		const themeSource = new JSONDataSource(themeData);

		it("should apply alternating row colors when enabled", () => {
			chalk.level = 1;
			const theme: TableTheme = {
				cell: { color: "green" },
				alternatingCell: { color: "yellow" },
			} as any;
			const formatter = new TableFormatter(themeSource, {
				alternatingRows: true,
				theme,
			});
			const output = formatter.render();
			const rows = output.split("\n");

			expect(rows[3]).toContain("\u001b[32m"); // green
			expect(rows[4]).toContain("\u001b[33m"); // yellow
			expect(rows[5]).toContain("\u001b[32m"); // green again
		});

		it("should correctly merge a partial theme with the default theme", () => {
			chalk.level = 1;
			const formatter = new TableFormatter(source, {
				theme: { header: { color: "red" } },
			});
			const output = formatter.render();
			expect(output).toContain("\u001b[31m"); // red
			expect(output).toContain("\u001b[1m"); // bold (from default)
		});

		it("should support hex codes for colors", () => {
			chalk.level = 3;
			const formatter = new TableFormatter(source, {
				theme: { header: { color: "#8A2BE2" } }, // BlueViolet
			});
			const output = formatter.render();
			expect(output).toContain("\u001b[38;2;138;43;226m");
		});
	});

	// --- New Advanced Formatting and Dynamic Styles Tests ---

	describe("Advanced Formatting and Dynamic Styles", () => {
		it("should handle per-column padding overrides", () => {
			const formatter = new TableFormatter(source, {
				padding: { left: 1, right: 1 },
				columns: {
					name: {
						// Give this column extra padding
						padding: { left: 3, right: 3 },
					},
				},
			});
			// A snapshot is the best way to verify visual layout changes
			expect(formatter.render()).toMatchSnapshot();
		});

		it("should stringify object cell values by default", () => {
			const data = [{ id: 1, payload: { value: 42, active: true } }];
			const formatter = new TableFormatter(new JSONDataSource(data));
			expect(formatter.render()).toContain('{"value":42,"active":true}');
		});

		it("should pass the correct rowIndex to the formatter function", () => {
			const data = [{ item: "a" }, { item: "b" }, { item: "c" }];
			const formatter = new TableFormatter(new JSONDataSource(data), {
				columns: {
					item: {
						formatter: (val, rowIndex) => `Value: ${val}, Index: ${rowIndex}`,
					},
				},
			});
			const output = formatter.render();
			expect(output).toContain("Value: a, Index: 0");
			expect(output).toContain("Value: b, Index: 1");
			expect(output).toContain("Value: c, Index: 2");
		});

		it("should not re-style a pre-styled string from a formatter", () => {
			chalk.level = 1;
			const data = [{ item: "special" }];
			const formatter = new TableFormatter(new JSONDataSource(data), {
				theme: { cell: { color: "blue", italic: true } }, // This style should be ignored
				columns: {
					item: {
						// This formatter returns a string that is already styled
						formatter: () => chalk.red.bold("PRE-STYLED"),
					},
				},
			});
			const output = formatter.render();

			// It SHOULD contain the styles from the formatter
			expect(output).toContain("\u001b[31m"); // red
			expect(output).toContain("\u001b[1m"); // bold

			// It SHOULD NOT contain the styles from the theme
			expect(output).not.toContain("\u001b[34m"); // blue
			expect(output).not.toContain("\u001b[3m"); // italic
		});

		it("should layer all style types with correct precedence", () => {
			chalk.level = 1;
			const data = [
				{ product: "A", status: "OK" }, // alternating=false
				{ product: "B", status: "FAIL" }, // alternating=true
			];
			const source = new JSONDataSource(data);
			const formatter = new TableFormatter(source, {
				alternatingRows: true,
				theme: { alternatingCell: { backgroundColor: "yellow" } },
				rowStyle: (row) =>
					row.status === "FAIL" ? { color: "red" } : undefined,
				columns: {
					status: {
						cellStyle: (val) => (val === "FAIL" ? { bold: true } : undefined),
					},
				},
			});

			const output = formatter.render();
			const rows = output.split("\n");
			const failRow = rows[4]; // The row for product 'B'

			// 1. It should have a yellow background (from alternatingRows theme)
			expect(failRow).toContain("\u001b[43m");
			// 2. It should have red text (from rowStyle)
			expect(failRow).toContain("\u001b[31m");
			// 3. The "FAIL" text specifically should be bold (from cellStyle)
			expect(failRow).toMatch(/\u001b\[1m\s*FAIL\s*\u001b\[22m/);
		});
	});

	describe("Responsive Layout (Flexbox & Sizing)", () => {
		const responsiveData: JSONObject[] = [
			{
				id: 1,
				name: "A very long item name that will need truncation",
				price: 12.99,
				category: "Electronics",
			},
			{
				id: 2,
				name: "Short name",
				price: 5.0,
				category: "Groceries",
			},
		];
		const responsiveSource = new JSONDataSource(responsiveData);

		it("should expand a flexGrow column to fill available space", () => {
			const formatter = new TableFormatter(responsiveSource, {
				// Set a generous maxWidth to ensure there is space to grow into
				maxWidth: 100,
				columns: {
					id: {
						// This column should remain at its ideal width
					},
					name: {
						flexGrow: 1, // This column should expand to take up all remaining space
					},
					price: {
						alignment: "right",
					},
				},
			});
			const output = formatter.render();

			// Verify the total width respects maxWidth
			const firstLine = output.split("\n")[0];
			expect(firstLine.length).toBe(100);

			// Snapshot to visually confirm the 'name' column is very wide
			expect(output).toMatchSnapshot();
		});

		it("should divide extra space proportionally among flexGrow columns", () => {
			const formatter = new TableFormatter(responsiveSource, {
				maxWidth: 120,
				columns: {
					id: {
						alignment: "right",
					},
					name: {
						flexGrow: 2, // Should get twice as much extra space
					},
					price: {
						alignment: "right",
					},
					category: {
						flexGrow: 1, // Should get one share of extra space
					},
				},
			});
			const output = formatter.render();

			// Verify the total width respects maxWidth
			const firstLine = output.split("\n")[0];
			expect(firstLine.length).toBe(120);

			// Snapshot will show that 'name' grew more than 'category'
			expect(output).toMatchSnapshot();
		});

		it("should shrink columns to fit maxWidth while respecting minWidth", () => {
			const formatter = new TableFormatter(responsiveSource, {
				// Force shrinking
				maxWidth: 60,
				columns: {
					id: {},
					name: {
						minWidth: 25, // This long column cannot shrink below 25
					},
					price: {
						minWidth: 10,
					},
					category: {},
				},
			});
			const output = formatter.render();

			const firstLine = output.split("\n")[0];
			expect(firstLine.length).toBe(60);

			// Snapshot will show truncation on other columns, but 'name' and 'price'
			// will have a guaranteed minimum width.
			expect(output).toMatchSnapshot();
		});

		it("should not let a flexGrow column exceed its maxWidth", () => {
			const formatter = new TableFormatter(responsiveSource, {
				maxWidth: 120, // Lots of extra space
				columns: {
					id: {},
					name: {
						flexGrow: 1,
					},
					price: {
						alignment: "right",
					},
					category: {
						flexGrow: 1,
						maxWidth: 20, // This column will grow, but stop at 20 width
					},
				},
			});
			const output = formatter.render();

			// The 'name' column should have received the lion's share of the extra space,
			// because 'category' was capped.
			expect(output).toMatchSnapshot();
		});

		it("should correctly handle a complex scenario with all constraints", () => {
			const data = [{ a: "short", b: "medium length", c: "c", d: "d" }];
			const source = new JSONDataSource(data);
			const formatter = new TableFormatter(source, {
				maxWidth: 80,
				columns: {
					a: {
						// Will be forced wider by minWidth
						minWidth: 15,
					},
					b: {
						// Will start at ideal width and stay there
					},
					c: {
						// Will take a small share of extra space
						flexGrow: 1,
					},
					d: {
						// Will grow but stop at 10, giving the rest of its share away
						flexGrow: 2,
						maxWidth: 10,
					},
				},
			});

			const output = formatter.render();
			const firstLine = output.split("\n")[0];
			expect(firstLine.length).toBe(80);
			expect(output).toMatchSnapshot();
		});
	});
});

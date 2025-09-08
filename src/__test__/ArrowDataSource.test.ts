import { describe, it, expect } from "vitest";
import { tableFromArrays } from "apache-arrow";
import { ArrowDataSource } from "../ArrowDataSource";

describe("ArrowDataSource", () => {
	// Create the table using tableFromArrays
	const arrowTable = tableFromArrays({
		id: [1n, 2n],
		name: ["Arrow", "Data"],
		timestamp: [
			new Date("2023-01-01T12:00:00Z"),
			new Date("2023-01-02T12:00:00Z"),
		],
		active: [true, false],
	});

	it("should correctly extract column names from the schema", () => {
		const source = new ArrowDataSource(arrowTable);
		expect(source.getColumnNames()).toEqual([
			"id",
			"name",
			"timestamp",
			"active",
		]);
	});

	it("should return the correct row count", () => {
		const source = new ArrowDataSource(arrowTable);
		expect(source.getRowCount()).toBe(2);
	});

	it("should return the correct row and handle type conversions", () => {
		const source = new ArrowDataSource(arrowTable);
		const row1 = source.getArrayRow(0);

		expect(row1[0]).toBe("1"); // BigInt converted to string
		expect(row1[1]).toBe("Arrow");
		expect(row1[2]).toBe("2023-01-01T12:00:00.000Z"); // Date converted to ISO string
		expect(row1[3]).toBe(true);
	});
});

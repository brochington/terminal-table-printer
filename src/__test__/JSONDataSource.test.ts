import { describe, it, expect } from 'vitest'; // <-- Import from vitest
import { JSONDataSource, JSONObject } from '../JSONDataSource';

describe('JSONDataSource', () => {
  const sampleData: JSONObject[] = [
    { id: 1, name: 'Alice', value: 100 },
    { id: 2, name: 'Bob', value: null },
  ];

  it('should correctly determine column names from the first object', () => {
    const source = new JSONDataSource(sampleData);
    expect(source.getColumnNames()).toEqual(['id', 'name', 'value']);
  });

  it('should return an empty array for column names if data is empty', () => {
    const source = new JSONDataSource([]);
    expect(source.getColumnNames()).toEqual([]);
  });

  it('should return the correct row count', () => {
    const source = new JSONDataSource(sampleData);
    expect(source.getRowCount()).toBe(2);
  });

  it('should return the correct row as an array of values', () => {
    const source = new JSONDataSource(sampleData);
    expect(source.getArrayRow(0)).toEqual([1, 'Alice', 100]);
    expect(source.getArrayRow(1)).toEqual([2, 'Bob', null]);
  });

  it('should throw an error for an out-of-bounds row index', () => {
    const source = new JSONDataSource(sampleData);
    expect(() => source.getArrayRow(2)).toThrow('Row index out of bounds: 2');
    expect(() => source.getArrayRow(-1)).toThrow('Row index out of bounds: -1');
  });

  it('should handle data with inconsistent keys by following the schema of the first row', () => {
    const inconsistentData: JSONObject[] = [
      { id: 1, name: 'First' },
      { id: 2, extra: 'Field' } as JSONObject,
    ];
    const source = new JSONDataSource(inconsistentData);
    expect(source.getColumnNames()).toEqual(['id', 'name']);
    expect(source.getArrayRow(1)).toEqual([2, null]);
  });
});

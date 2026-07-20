import { describe, it, expect } from 'vitest';
import { dataNode, dataList, str, optStr, date, optDate } from './envelope';
import { MappingError } from './errors';

describe('envelope helpers', () => {
	it('dataNode extracts a single entry', () => {
		expect(dataNode({ data: { a: 1 } })).toEqual({ a: 1 });
	});
	it('dataNode throws on missing data', () => {
		expect(() => dataNode({})).toThrow(MappingError);
	});
	it('dataList extracts a collection', () => {
		expect(dataList({ data: [{ a: 1 }] })).toHaveLength(1);
	});
	it('dataList throws when data is not an array', () => {
		expect(() => dataList({ data: {} })).toThrow(MappingError);
	});
	it('str returns a present string', () => {
		expect(str({ title: 'Hi' }, 'title')).toBe('Hi');
	});
	it('str throws on empty/missing', () => {
		expect(() => str({ title: '' }, 'title')).toThrow(MappingError);
	});
	it('optStr returns undefined when absent', () => {
		expect(optStr({}, 'x')).toBeUndefined();
	});
	it('date parses ISO strings', () => {
		expect(date({ d: '2026-08-14T18:00:00Z' }, 'd').getUTCFullYear()).toBe(2026);
	});
	it('date throws on invalid value', () => {
		expect(() => date({ d: 'not-a-date' }, 'd')).toThrow(MappingError);
	});
	it('optDate returns undefined when absent, Date when present', () => {
		expect(optDate({}, 'd')).toBeUndefined();
		expect(optDate({ d: '2026-01-01' }, 'd')).toBeInstanceOf(Date);
	});
});

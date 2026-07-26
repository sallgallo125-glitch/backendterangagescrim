import { describe, it, expect } from 'vitest';
import { stableStringify } from '../lib/stableStringify';

describe('stableStringify', () => {
  it('serializes primitives like JSON.stringify', () => {
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('hello')).toBe('"hello"');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe(undefined);
  });

  it('sorts object keys for stable output regardless of insertion order', () => {
    const a = stableStringify({ z: 1, a: 2, m: 3 });
    const b = stableStringify({ m: 3, z: 1, a: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"m":3,"z":1}');
  });

  it('serializes arrays preserving order', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('sorts keys recursively in nested objects', () => {
    const a = stableStringify({ b: { y: 1, x: 2 }, a: 0 });
    const b = stableStringify({ a: 0, b: { x: 2, y: 1 } });
    expect(a).toBe(b);
  });

  it('handles empty object and empty array', () => {
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify([])).toBe('[]');
  });

  it('produces different outputs for different params', () => {
    const k1 = stableStringify({ page: 1, search: 'foo' });
    const k2 = stableStringify({ page: 2, search: 'foo' });
    expect(k1).not.toBe(k2);
  });
});

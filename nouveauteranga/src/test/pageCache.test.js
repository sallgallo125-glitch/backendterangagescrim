import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCached, setCached, hasCached, clearCached } from '../lib/pageCache';

beforeEach(() => clearCached());

describe('pageCache', () => {
  it('returns null for unknown key', () => {
    expect(getCached('unknown')).toBeNull();
  });

  it('stores and retrieves data', () => {
    setCached('key1', { total: 42 });
    expect(getCached('key1')).toEqual({ total: 42 });
  });

  it('hasCached returns true when present', () => {
    setCached('key2', [1, 2, 3]);
    expect(hasCached('key2')).toBe(true);
  });

  it('hasCached returns false when absent', () => {
    expect(hasCached('missing')).toBe(false);
  });

  it('clearCached(key) removes only that key', () => {
    setCached('a', 1);
    setCached('b', 2);
    clearCached('a');
    expect(getCached('a')).toBeNull();
    expect(getCached('b')).toBe(2);
  });

  it('clearCached() without arg clears everything', () => {
    setCached('x', 10);
    setCached('y', 20);
    clearCached();
    expect(getCached('x')).toBeNull();
    expect(getCached('y')).toBeNull();
  });

  it('returns null after TTL expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(now)          // setCached timestamp
      .mockReturnValueOnce(now + 6 * 60 * 1000); // getCached check — 6 min later
    setCached('ttl', 'data');
    expect(getCached('ttl')).toBeNull();
    vi.restoreAllMocks();
  });

  it('returns data before TTL expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now + 4 * 60 * 1000); // 4 min later — still valid
    setCached('fresh', 'ok');
    expect(getCached('fresh')).toBe('ok');
    vi.restoreAllMocks();
  });
});

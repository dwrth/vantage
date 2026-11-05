import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createId', () => {
  it('delegates to crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'fixed-uuid');
    vi.stubGlobal('crypto', { randomUUID });
    expect(createId()).toBe('fixed-uuid');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('returns a v4 UUID from the native implementation', () => {
    expect(createId()).toMatch(UUID_V4);
  });

  describe.each([
    ['crypto undefined', undefined],
    ['crypto without randomUUID', {}],
  ])('fallback (%s)', (_name, stub) => {
    it('produces well-formed v4 UUIDs', () => {
      vi.stubGlobal('crypto', stub);
      for (let i = 0; i < 200; i++) {
        expect(createId()).toMatch(UUID_V4);
      }
    });

    it('produces unique ids', () => {
      vi.stubGlobal('crypto', stub);
      const ids = new Set(Array.from({ length: 500 }, () => createId()));
      expect(ids.size).toBe(500);
    });

    it('maps Math.random extremes to valid hex digits and variant bits', () => {
      vi.stubGlobal('crypto', stub);
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(createId()).toBe('00000000-0000-4000-8000-000000000000');
      random.mockReturnValue(0.999999);
      expect(createId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  MIN_CROP_SCALE,
  clampCropScale,
  clampPercent,
  getSectionBackgroundImageStyle,
  sectionBackgroundToCropState,
  sectionSizeToObjectFit,
  toCssUrl,
  usesLegacyBackgroundPosition,
} from './backgroundDisplay';

describe('clampPercent', () => {
  it.each([
    [-5, 0],
    [0, 0],
    [42.5, 42.5],
    [100, 100],
    [250, 100],
  ])('clamps %s to %s', (input, expected) => {
    expect(clampPercent(input)).toBe(expected);
  });
});

describe('clampCropScale', () => {
  it.each([
    [0, MIN_CROP_SCALE],
    [MIN_CROP_SCALE, MIN_CROP_SCALE],
    [0.7, 0.7],
    [1, 1],
    [3, 1],
  ])('clamps %s to %s', (input, expected) => {
    expect(clampCropScale(input)).toBe(expected);
  });

  it('always lands inside [MIN_CROP_SCALE, 1]', () => {
    for (let v = -2; v <= 3; v += 0.13) {
      const out = clampCropScale(v);
      expect(out).toBeGreaterThanOrEqual(MIN_CROP_SCALE);
      expect(out).toBeLessThanOrEqual(1);
    }
  });
});

describe('toCssUrl', () => {
  it('wraps a url in a quoted url()', () => {
    expect(toCssUrl('https://x.test/a.png')).toBe('url("https://x.test/a.png")');
  });

  it('escapes quotes and backslashes', () => {
    expect(toCssUrl('a"b\\c')).toBe('url("a\\"b\\\\c")');
  });

  it('escapes newlines so the value cannot break out of the url', () => {
    expect(toCssUrl('a\nb')).toBe('url("a\\nb")');
  });
});

describe('sectionSizeToObjectFit', () => {
  it.each([
    ['contain', 'contain'],
    ['auto', 'scale-down'],
    ['cover', 'cover'],
    [undefined, 'cover'],
  ] as const)('maps %s to %s', (size, fit) => {
    expect(sectionSizeToObjectFit(size)).toBe(fit);
  });
});

describe('sectionBackgroundToCropState', () => {
  it('defaults to centered, unzoomed', () => {
    expect(sectionBackgroundToCropState()).toEqual({
      objectPositionX: 50,
      objectPositionY: 50,
      cropScale: 1,
    });
  });

  it('uses explicit values and clamps them', () => {
    expect(
      sectionBackgroundToCropState({ objectPositionX: 120, objectPositionY: -3, cropScale: 0.1 }),
    ).toEqual({ objectPositionX: 100, objectPositionY: 0, cropScale: MIN_CROP_SCALE });
  });

  it('falls back to percent parts of imagePosition', () => {
    expect(sectionBackgroundToCropState({ imagePosition: '20% 80%' })).toMatchObject({
      objectPositionX: 20,
      objectPositionY: 80,
    });
    expect(sectionBackgroundToCropState({ imagePosition: '  12.5%   7.5% ' })).toMatchObject({
      objectPositionX: 12.5,
      objectPositionY: 7.5,
    });
  });

  it('prefers explicit coordinates over imagePosition per axis', () => {
    expect(
      sectionBackgroundToCropState({ objectPositionX: 10, imagePosition: '90% 90%' }),
    ).toMatchObject({ objectPositionX: 10, objectPositionY: 90 });
  });

  it('ignores non-percent or missing imagePosition parts', () => {
    expect(sectionBackgroundToCropState({ imagePosition: 'center' })).toMatchObject({
      objectPositionX: 50,
      objectPositionY: 50,
    });
    expect(sectionBackgroundToCropState({ imagePosition: '30% top' })).toMatchObject({
      objectPositionX: 30,
      objectPositionY: 50,
    });
    expect(sectionBackgroundToCropState({ imagePosition: '40%' })).toMatchObject({
      objectPositionX: 40,
      objectPositionY: 50,
    });
    for (const imagePosition of ['', '   ']) {
      expect(sectionBackgroundToCropState({ imagePosition })).toMatchObject({
        objectPositionX: 50,
        objectPositionY: 50,
      });
    }
  });

  it('clamps out-of-range imagePosition percentages', () => {
    expect(sectionBackgroundToCropState({ imagePosition: '150% 150%' })).toMatchObject({
      objectPositionX: 100,
      objectPositionY: 100,
    });
  });
});

describe('getSectionBackgroundImageStyle', () => {
  it('returns object-fit styling without measurements', () => {
    expect(
      getSectionBackgroundImageStyle('contain', { objectPositionX: 25, objectPositionY: 75 }),
    ).toEqual({
      objectFit: 'contain',
      objectPosition: '25% 75%',
      width: '100%',
      height: '100%',
    });
  });

  it('returns object-fit styling when only one measurement is given or the box is empty', () => {
    const expected = {
      objectFit: 'cover',
      objectPosition: '50% 50%',
      width: '100%',
      height: '100%',
    };
    expect(getSectionBackgroundImageStyle(undefined, undefined, { width: 10, height: 10 })).toEqual(
      expected,
    );
    expect(
      getSectionBackgroundImageStyle(undefined, undefined, undefined, { width: 10, height: 10 }),
    ).toEqual(expected);
    expect(
      getSectionBackgroundImageStyle(
        undefined,
        undefined,
        { width: 10, height: 10 },
        { width: 0, height: 10 },
      ),
    ).toEqual(expected);
    expect(
      getSectionBackgroundImageStyle(
        undefined,
        undefined,
        { width: 10, height: 10 },
        { width: 10, height: 0 },
      ),
    ).toEqual(expected);
  });

  it('cover fills the box and centers the overflow', () => {
    const style = getSectionBackgroundImageStyle(
      'cover',
      undefined,
      { width: 200, height: 100 },
      { width: 100, height: 100 },
    );
    expect(style).toEqual({
      position: 'absolute',
      width: '200%',
      height: '100%',
      left: '-50%',
      top: '0%',
      maxWidth: 'none',
    });
  });

  it('contain fits inside the box and centers', () => {
    const style = getSectionBackgroundImageStyle(
      'contain',
      undefined,
      { width: 200, height: 100 },
      { width: 100, height: 100 },
    );
    expect(style).toMatchObject({ width: '100%', height: '50%', left: '0%', top: '25%' });
  });

  it('scale-down never upscales beyond natural size', () => {
    const small = getSectionBackgroundImageStyle(
      'auto',
      undefined,
      { width: 50, height: 50 },
      { width: 100, height: 100 },
    );
    expect(small).toMatchObject({ width: '50%', height: '50%', left: '25%', top: '25%' });
    const large = getSectionBackgroundImageStyle(
      'auto',
      undefined,
      { width: 400, height: 400 },
      { width: 100, height: 100 },
    );
    expect(large).toMatchObject({ width: '100%', height: '100%' });
  });

  it('cropScale zooms in and focal point positions the overflow', () => {
    const style = getSectionBackgroundImageStyle(
      'cover',
      { cropScale: 0.5, objectPositionX: 0, objectPositionY: 100 },
      { width: 100, height: 100 },
      { width: 100, height: 100 },
    );
    expect(style).toMatchObject({ width: '200%', height: '200%', left: '0%', top: '-100%' });
  });

  it('keeps the rendered image covering the box for any focal point', () => {
    for (const x of [0, 25, 50, 100]) {
      for (const y of [0, 50, 100]) {
        const style = getSectionBackgroundImageStyle(
          'cover',
          { objectPositionX: x, objectPositionY: y, cropScale: 0.6 },
          { width: 300, height: 200 },
          { width: 120, height: 90 },
        );
        const w = parseFloat(String(style.width));
        const h = parseFloat(String(style.height));
        const left = parseFloat(String(style.left));
        const top = parseFloat(String(style.top));
        expect(left).toBeLessThanOrEqual(1e-9);
        expect(top).toBeLessThanOrEqual(1e-9);
        expect(left + w).toBeGreaterThanOrEqual(100 - 1e-9);
        expect(top + h).toBeGreaterThanOrEqual(100 - 1e-9);
      }
    }
  });
});

describe('usesLegacyBackgroundPosition', () => {
  it('is true when no crop fields are set', () => {
    expect(usesLegacyBackgroundPosition()).toBe(true);
    expect(usesLegacyBackgroundPosition({})).toBe(true);
  });

  it.each([{ objectPositionX: 0 }, { objectPositionY: 0 }, { cropScale: 1 }])(
    'is false when %o is set',
    (background) => {
      expect(usesLegacyBackgroundPosition(background)).toBe(false);
    },
  );
});

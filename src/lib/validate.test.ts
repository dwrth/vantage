import { describe, expect, it } from 'vitest';
import { createEmptyLayout, addItem, addSection } from '../mutations/layout';
import { isValidLayout, validateLayout } from './validate';

function validLayout() {
  return {
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: { mobile: 640, tablet: 1023 },
    breakpointPreviewWidths: { mobile: 390, tablet: 768 },
    meta: { page: 'home' },
    sections: [
      {
        id: 's1',
        label: 'Hero',
        columns: 12,
        colGap: 8,
        rowGap: 8,
        paddingTop: 24,
        paddingBottom: 24,
        rows: 6,
        background: {
          color: '#fff',
          image: 'https://example.com/a.png',
          imageSize: 'cover',
          imagePosition: 'center',
          imageRepeat: 'no-repeat',
          objectPositionX: 50,
          objectPositionY: 0,
          cropScale: 0.5,
          blur: 4,
          opacity: 1,
          parallax: true,
        },
        items: [
          { id: 'a', kind: 'text', x: 0, y: 0, w: 6, h: 2, label: 'A', data: { text: 'hi' } },
          { id: 'b', kind: 'image', x: 6, y: 0, w: 6, h: 4, ref: 'img-1', meta: { locked: 1 } },
        ],
        overrides: {
          mobile: {
            columns: 4,
            rows: 8,
            items: { a: { x: 0, y: 0, w: 4 }, b: { hidden: true, data: { alt: 'x' } } },
          },
          tablet: { colGap: 4, rowGap: 4, paddingTop: 0, paddingBottom: 0 },
        },
      },
    ],
  };
}

type Mutable = ReturnType<typeof validLayout>;

/** Clone the valid fixture, apply one breakage, and expect exactly one error at `path`. */
function broken(mutate: (layout: Mutable & Record<string, unknown>) => void) {
  const layout = structuredClone(validLayout()) as Mutable & Record<string, unknown>;
  mutate(layout);
  return layout;
}

const s0 = (l: Mutable) => l.sections[0] as unknown as Record<string, unknown>;
const item0 = (l: Mutable) => l.sections[0]!.items[0] as unknown as Record<string, unknown>;

describe('validateLayout', () => {
  it('accepts a fully populated layout', () => {
    expect(validateLayout(validLayout())).toEqual({ valid: true, errors: [] });
    expect(isValidLayout(validLayout())).toBe(true);
  });

  it('accepts layouts built by the mutations', () => {
    const { layout, sectionId } = addSection(createEmptyLayout());
    const withItem = addItem(layout, sectionId, 'text', { data: { text: 'x' } });
    expect(validateLayout(withItem).errors).toEqual([]);
  });

  it('rejects non-objects with a single top-level reason', () => {
    for (const raw of [null, undefined, 1, 'layout', []]) {
      expect(validateLayout(raw)).toEqual({ valid: false, errors: ['layout must be an object'] });
      expect(isValidLayout(raw)).toBe(false);
    }
  });

  const cases: [string, (l: Mutable & Record<string, unknown>) => void, string][] = [
    ['layout meta', (l) => (l.meta = [] as never), 'meta: must be an object'],
    [
      'breakpoints type',
      (l) => (l.breakpoints = 'desktop' as never),
      'breakpoints: must be an array',
    ],
    ['empty breakpoints', (l) => (l.breakpoints = []), 'breakpoints: must not be empty'],
    [
      'duplicate breakpoints',
      (l) => (l.breakpoints = ['desktop', 'desktop']),
      'breakpoints: must not contain duplicates',
    ],
    [
      'missing desktop',
      (l) => {
        l.breakpoints = ['mobile'];
        l.breakpointWidths = { mobile: 640 } as never;
        l.breakpointPreviewWidths = { mobile: 390 } as never;
      },
      'breakpoints: must include "desktop"',
    ],
    [
      'unknown breakpoint',
      (l) => (l.breakpoints = ['desktop', 'tablet', 'mobile', 'watch']),
      'breakpoints: unknown breakpoint "watch"',
    ],
    [
      'missing width for an enabled breakpoint',
      (l) => (l.breakpointWidths = { mobile: 640 } as never),
      'breakpointWidths.tablet: is required for an enabled breakpoint',
    ],
    [
      'width for a disabled breakpoint',
      (l) => {
        l.breakpoints = ['desktop', 'mobile'];
        l.breakpointPreviewWidths = { mobile: 390 } as never;
      },
      'breakpointWidths.tablet: is not an enabled non-desktop breakpoint',
    ],
    [
      'fractional width',
      (l) => (l.breakpointWidths.mobile = 640.5),
      'breakpointWidths.mobile: must be an integer >= 1',
    ],
    [
      'mobile not below tablet',
      (l) => (l.breakpointWidths.mobile = 1023),
      'breakpointWidths: mobile must be smaller than tablet',
    ],
    ['sections type', (l) => (l.sections = {} as never), 'sections: must be an array'],
    ['section type', (l) => (l.sections[0] = 'x' as never), 'sections[0]: must be an object'],
    ['section id', (l) => (s0(l).id = 1), 'sections[0].id: must be a string'],
    ['columns < 1', (l) => (s0(l).columns = 0), 'sections[0].columns: must be >= 1'],
    ['NaN gap', (l) => (s0(l).colGap = NaN), 'sections[0].colGap: must be a finite number'],
    ['negative padding', (l) => (s0(l).paddingTop = -1), 'sections[0].paddingTop: must be >= 0'],
    ['fractional rows', (l) => (s0(l).rows = 1.5), 'sections[0].rows: must be an integer >= 1'],
    ['section label', (l) => (s0(l).label = 3), 'sections[0].label: must be a string'],
    [
      'background image size',
      (l) => ((s0(l).background as Record<string, unknown>).imageSize = 'fill'),
      'sections[0].background.imageSize: must be one of cover, contain, auto',
    ],
    [
      'background opacity',
      (l) => ((s0(l).background as Record<string, unknown>).opacity = 2),
      'sections[0].background.opacity: must be <= 1',
    ],
    [
      'background crop scale',
      (l) => ((s0(l).background as Record<string, unknown>).cropScale = 0.1),
      'sections[0].background.cropScale: must be >= 0.4',
    ],
    ['items type', (l) => (s0(l).items = {}), 'sections[0].items: must be an array'],
    [
      'item kind',
      (l) => (item0(l).kind = ''),
      'sections[0].items[0].kind: must be a non-empty string',
    ],
    ['item w', (l) => (item0(l).w = '6'), 'sections[0].items[0].w: must be a finite number'],
    ['item data', (l) => (item0(l).data = 'x'), 'sections[0].items[0].data: must be an object'],
    ['item ref', (l) => (item0(l).ref = 5), 'sections[0].items[0].ref: must be a string'],
    [
      'unknown override breakpoint',
      (l) => ((s0(l).overrides as Record<string, unknown>).desktop = {}),
      'sections[0].overrides.desktop: must be one of tablet, mobile',
    ],
    [
      'override rows',
      (l) => (l.sections[0]!.overrides.mobile.rows = 0),
      'sections[0].overrides.mobile.rows: must be an integer >= 1',
    ],
    [
      'item override w',
      (l) => (l.sections[0]!.overrides.mobile.items.a.w = 0),
      'sections[0].overrides.mobile.items.a.w: must be >= 1',
    ],
    [
      'item override hidden',
      (l) => (l.sections[0]!.overrides.mobile.items.b.hidden = 'yes' as never),
      'sections[0].overrides.mobile.items.b.hidden: must be a boolean',
    ],
    [
      'duplicate item id',
      (l) => (l.sections[0]!.items[1]!.id = 'a'),
      'sections[0].items[1].id: duplicate item id "a"',
    ],
    [
      'duplicate section id',
      (l) => l.sections.push({ ...structuredClone(l.sections[0]!), items: [] }),
      'sections[1].id: duplicate section id "s1"',
    ],
  ];

  it.each(cases)('reports %s', (_name, mutate, error) => {
    const layout = broken(mutate);
    const result = validateLayout(layout);
    expect(result).toEqual({ valid: false, errors: [error] });
    expect(isValidLayout(layout)).toBe(false);
  });

  it('collects every problem instead of stopping at the first', () => {
    const layout = broken((l) => {
      l.meta = 1 as never;
      item0(l).x = Infinity;
      item0(l).h = undefined;
      l.sections[0]!.overrides.mobile.items.a.w = -1;
    });
    expect(validateLayout(layout).errors).toEqual([
      'meta: must be an object',
      'sections[0].items[0].x: must be a finite number',
      'sections[0].items[0].h: must be a finite number',
      'sections[0].overrides.mobile.items.a.w: must be >= 1',
    ]);
  });

  it('reports holes in sparse arrays', () => {
    const layout = broken((l) => delete (l.sections[0]!.items as unknown[])[0]);
    expect(validateLayout(layout).errors).toEqual(['sections[0].items[0]: must be an object']);
  });

  it('allows desktop-only layouts with empty width maps', () => {
    const layout = {
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
      sections: [],
    };
    expect(validateLayout(layout).errors).toEqual([]);
  });

  it('does not enforce width order on preview widths', () => {
    const layout = broken((l) => (l.breakpointPreviewWidths = { mobile: 900, tablet: 400 }));
    expect(validateLayout(layout).errors).toEqual([]);
  });
});

describe('fill-screen and full-bleed fields', () => {
  it('accepts fillScreen, verticalAlign and fullBleed', () => {
    const layout = broken((l) => {
      Object.assign(s0(l), { fillScreen: true, verticalAlign: 'center' });
      item0(l).fullBleed = true;
    });
    expect(validateLayout(layout).errors).toEqual([]);
  });

  it('rejects wrongly typed values with their path', () => {
    const layout = broken((l) => {
      Object.assign(s0(l), { fillScreen: 'yes', verticalAlign: 'middle' });
      item0(l).fullBleed = 1;
    });
    expect(validateLayout(layout).errors).toEqual([
      'sections[0].fillScreen: must be a boolean',
      'sections[0].verticalAlign: must be one of start, center, end',
      'sections[0].items[0].fullBleed: must be a boolean',
    ]);
  });
});

describe('desktop hidden', () => {
  it('accepts a boolean item hidden flag', () => {
    const layout = broken((l) => {
      item0(l).hidden = true;
    });
    expect(validateLayout(layout).errors).toEqual([]);
  });

  it('rejects a non-boolean item hidden flag', () => {
    const layout = broken((l) => {
      item0(l).hidden = 'yes';
    });
    expect(validateLayout(layout).errors).toEqual([
      'sections[0].items[0].hidden: must be a boolean',
    ]);
  });
});

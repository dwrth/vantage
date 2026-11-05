import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbLayout } from '../test/arbitraries';
import type { Layout } from '../types';
import { isValidLayout, validateLayout } from './validate';

const RUNS = { numRuns: 150, seed: 20261105 };

type Raw = Record<string, unknown>;

type Located = { layout: Layout; s: number; i: number };

const arbWithItem: fc.Arbitrary<Located> = fc
  .tuple(arbLayout({ arrangements: 0.3 }), fc.nat(), fc.nat())
  .filter(([layout]) => layout.sections.some((section) => section.items.length > 0))
  .map(([layout, s, i]) => {
    const withItems = layout.sections
      .map((section, index) => ({ section, index }))
      .filter(({ section }) => section.items.length > 0);
    const pick = withItems[s % withItems.length]!;
    return { layout, s: pick.index, i: i % pick.section.items.length };
  });

const arbWithSection: fc.Arbitrary<Located> = fc
  .tuple(arbLayout(), fc.nat())
  .map(([layout, s]) => ({ layout, s: s % layout.sections.length, i: 0 }));

function corrupt(
  { layout, s, i }: Located,
  mutate: (raw: Raw, section: Raw, item: Raw | undefined) => void,
) {
  const raw = structuredClone(layout) as unknown as Raw & { sections: Raw[] };
  const section = raw.sections[s]!;
  mutate(raw, section, (section.items as Raw[])[i]);
  return validateLayout(raw);
}

function expectOnly(result: ReturnType<typeof validateLayout>, error: string) {
  expect(result).toEqual({ valid: false, errors: [error] });
}

describe('validateLayout on generated layouts', () => {
  it('accepts every generated layout, also after a JSON round trip', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 4 }), (layout) => {
        expect(validateLayout(layout)).toEqual({ valid: true, errors: [] });
        expect(isValidLayout(JSON.parse(JSON.stringify(layout)))).toBe(true);
      }),
      RUNS,
    );
  });
});

describe('validateLayout rejects one targeted corruption with exactly one error', () => {
  it('a non-finite item size', () => {
    fc.assert(
      fc.property(arbWithItem, fc.constantFrom('x', 'y', 'w', 'h'), (located, key) => {
        const result = corrupt(located, (_raw, _section, item) => (item![key] = Number.NaN));
        expectOnly(
          result,
          `sections[${located.s}].items[${located.i}].${key}: must be a finite number`,
        );
      }),
      RUNS,
    );
  });

  it('an empty item kind', () => {
    fc.assert(
      fc.property(arbWithItem, (located) => {
        const result = corrupt(located, (_raw, _section, item) => (item!.kind = ''));
        expectOnly(
          result,
          `sections[${located.s}].items[${located.i}].kind: must be a non-empty string`,
        );
      }),
      RUNS,
    );
  });

  it('a duplicated item id', () => {
    fc.assert(
      fc.property(
        arbLayout({ maxSections: 3 }).filter(
          (layout) => layout.sections.flatMap((section) => section.items).length >= 2,
        ),
        (layout) => {
          const located = layout.sections.flatMap((section, s) =>
            section.items.map((item, i) => ({ s, i, id: item.id })),
          );
          const first = located[0]!;
          const last = located.at(-1)!;
          const result = corrupt({ layout, s: last.s, i: last.i }, (_raw, _section, item) => {
            item!.id = first.id;
          });
          expectOnly(
            result,
            `sections[${last.s}].items[${last.i}].id: duplicate item id "${first.id}"`,
          );
        },
      ),
      RUNS,
    );
  });

  it('a duplicated section id', () => {
    fc.assert(
      fc.property(arbLayout({ minSections: 2, maxSections: 4 }), fc.nat(), (layout, pick) => {
        const s = 1 + (pick % (layout.sections.length - 1));
        const result = corrupt({ layout, s, i: 0 }, (_raw, section) => (section.id = 's0'));
        expectOnly(result, `sections[${s}].id: duplicate section id "s0"`);
      }),
      RUNS,
    );
  });

  it('a column count below one', () => {
    fc.assert(
      fc.property(arbWithSection, fc.integer({ min: -5, max: 0 }), (located, columns) => {
        const result = corrupt(located, (_raw, section) => (section.columns = columns));
        expectOnly(result, `sections[${located.s}].columns: must be >= 1`);
      }),
      RUNS,
    );
  });

  it('a fractional section height', () => {
    fc.assert(
      fc.property(arbWithSection, (located) => {
        const result = corrupt(located, (_raw, section) => (section.rows = 2.5));
        expectOnly(result, `sections[${located.s}].rows: must be an integer >= 1`);
      }),
      RUNS,
    );
  });

  it('an item override narrower than one column', () => {
    fc.assert(
      fc.property(arbWithItem, fc.constantFrom('tablet', 'mobile'), (located, bp) => {
        const section = located.layout.sections[located.s]!;
        const id = section.items[located.i]!.id;
        const result = corrupt(located, (_raw, rawSection) => {
          const overrides = (rawSection.overrides ?? {}) as Raw;
          const override = (overrides[bp] ?? {}) as Raw;
          const items = (override.items ?? {}) as Raw;
          items[id] = { ...(items[id] as Raw | undefined), w: 0 };
          rawSection.overrides = { ...overrides, [bp]: { ...override, items } };
        });
        expectOnly(result, `sections[${located.s}].overrides.${bp}.items.${id}.w: must be >= 1`);
      }),
      RUNS,
    );
  });

  it('an override for desktop', () => {
    fc.assert(
      fc.property(arbWithSection, (located) => {
        const result = corrupt(located, (_raw, section) => {
          section.overrides = { ...(section.overrides as Raw | undefined), desktop: {} };
        });
        expectOnly(
          result,
          `sections[${located.s}].overrides.desktop: must be one of tablet, mobile`,
        );
      }),
      RUNS,
    );
  });

  it('an unknown arrangement preset', () => {
    fc.assert(
      fc.property(arbWithSection, (located) => {
        const result = corrupt(located, (_raw, section) => {
          section.arrangement = { ...(section.arrangement as Raw | undefined), preset: 'nope' };
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatch(
          new RegExp(`^sections\\[${located.s}\\]\\.arrangement\\.preset: must be one of `),
        );
      }),
      RUNS,
    );
  });

  it('a layout without desktop', () => {
    fc.assert(
      fc.property(arbLayout(), (layout) => {
        const result = corrupt({ layout, s: 0, i: 0 }, (raw) => {
          raw.breakpoints = (raw.breakpoints as string[]).filter((bp) => bp !== 'desktop');
        });
        const expected =
          layout.breakpoints.length === 1
            ? 'breakpoints: must not be empty'
            : 'breakpoints: must include "desktop"';
        expectOnly(result, expected);
      }),
      RUNS,
    );
  });

  it('a missing width for an enabled breakpoint', () => {
    fc.assert(
      fc.property(
        arbLayout({ maxSections: 2 }).filter((layout) => layout.breakpoints.length > 1),
        fc.nat(),
        (layout, pick) => {
          const enabled = layout.breakpoints.filter((bp) => bp !== 'desktop');
          const bp = enabled[pick % enabled.length]!;
          const result = corrupt({ layout, s: 0, i: 0 }, (raw) => {
            delete (raw.breakpointWidths as Raw)[bp];
          });
          expectOnly(result, `breakpointWidths.${bp}: is required for an enabled breakpoint`);
        },
      ),
      RUNS,
    );
  });

  it('a mobile cut-off at or above the tablet one', () => {
    fc.assert(
      fc.property(
        arbLayout({ maxSections: 2 }).filter((layout) => layout.breakpoints.length === 3),
        fc.nat({ max: 50 }),
        (layout, extra) => {
          const result = corrupt({ layout, s: 0, i: 0 }, (raw) => {
            const widths = raw.breakpointWidths as Raw;
            widths.mobile = (widths.tablet as number) + extra;
          });
          expectOnly(result, 'breakpointWidths: mobile must be smaller than tablet');
        },
      ),
      RUNS,
    );
  });
});

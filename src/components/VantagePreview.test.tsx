import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ComponentRegistry, Layout, Section } from '../types';
import { VantagePreview } from './VantagePreview';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

function render(section: Partial<Section>, itemExtra: object = {}, breakpoints = ['desktop']) {
  const layout = {
    breakpoints,
    breakpointWidths: breakpoints.includes('mobile') ? { mobile: 640 } : {},
    breakpointPreviewWidths: {},
    sections: [
      {
        id: 's',
        columns: 12,
        colGap: 8,
        rowGap: 8,
        rows: 4,
        items: [{ id: 'a', kind: 'block', x: 2, y: 0, w: 4, h: 2, ...itemExtra }],
        ...section,
      },
    ],
  } as Layout;
  return renderToStaticMarkup(<VantagePreview value={layout} components={components} />);
}

describe('VantagePreview fill screen', () => {
  it('does not add fill styling by default', () => {
    const html = render({});
    expect(html).not.toContain('align-content');
    expect(html).not.toContain('--fill');
  });

  it.each(['start', 'center', 'end'] as const)('aligns content to %s', (verticalAlign) => {
    const html = render({ fillScreen: true, verticalAlign });
    expect(html).toContain('--fill');
    expect(html).toContain(`align-content:${verticalAlign}`);
  });

  it('defaults the alignment to start', () => {
    expect(render({ fillScreen: true })).toContain('align-content:start');
  });

  it('ignores verticalAlign while fillScreen is off', () => {
    expect(render({ verticalAlign: 'end' })).not.toContain('align-content');
  });
});

describe('VantagePreview full bleed', () => {
  it('places a regular item on its columns', () => {
    expect(render({})).toContain('grid-column:4 / span 4');
  });

  it('spans the whole grid width for a full-bleed item', () => {
    expect(render({}, { fullBleed: true })).toContain('grid-column:1 / -1');
  });

  it('spans the whole grid width on every breakpoint when responsive', () => {
    const html = render({}, { fullBleed: true }, ['desktop', 'mobile']);
    expect(html).toContain('--vp-desktop-col:1 / -1');
    expect(html).toContain('--vp-mobile-col:1 / -1');
  });
});

describe('VantagePreview reading order', () => {
  const labelled: ComponentRegistry = {
    block: {
      component: ({ item }) => <span>{item.id}</span>,
      defaults: { w: 1, h: 1 },
    },
  };

  it('renders blocks by row, then column, and keeps the stacking order in `order`', () => {
    const layout = {
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
      sections: [
        {
          id: 's',
          columns: 12,
          colGap: 8,
          rowGap: 8,
          rows: 6,
          items: [
            { id: 'below', kind: 'block', x: 0, y: 3, w: 2, h: 2 },
            { id: 'right', kind: 'block', x: 6, y: 0, w: 2, h: 2 },
            { id: 'left', kind: 'block', x: 0, y: 0, w: 2, h: 2 },
          ],
        },
      ],
    } as Layout;
    const html = renderToStaticMarkup(<VantagePreview value={layout} components={labelled} />);
    const ids = [...html.matchAll(/<span>(\w+)<\/span>/g)].map((m) => m[1]);
    expect(ids).toEqual(['left', 'right', 'below']);
    const orders = [...html.matchAll(/order:(\d+)/g)].map((m) => m[1]);
    expect(orders).toEqual(['2', '1', '0']);
  });
});

describe('VantagePreview content alignment', () => {
  it('adds no alignment for items without one', () => {
    const html = render({}, {}, ['desktop', 'mobile']);
    expect(html).not.toContain('data-valign');
    expect(html).not.toContain('data-vp-valign=');
  });

  it('marks the alignment in single-breakpoint mode', () => {
    expect(render({}, { verticalAlign: 'center' })).toContain('data-valign="center"');
  });

  it('emits one token per breakpoint in responsive mode, overrides included', () => {
    const html = render(
      { overrides: { mobile: { items: { a: { verticalAlign: 'end' } } } } },
      { verticalAlign: 'center' },
      ['desktop', 'mobile'],
    );
    expect(html).toContain('data-vp-valign="desktop-center mobile-end"');
    // Scoped rules pick the token of the active breakpoint.
    expect(html).toContain('[data-vp-valign~="mobile-end"]{justify-content:flex-end');
    expect(html).toContain('[data-vp-valign~="desktop-center"]{justify-content:center');
  });
});

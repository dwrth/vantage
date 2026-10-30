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

describe('VantagePreview desktop hidden', () => {
  const labelled: ComponentRegistry = {
    block: {
      component: ({ item }) => <span>{item.id}</span>,
      defaults: { w: 1, h: 1 },
    },
  };

  function layoutWith(breakpoints: string[]): Layout {
    return {
      breakpoints,
      breakpointWidths: { tablet: 1023, mobile: 640 },
      breakpointPreviewWidths: {},
      sections: [
        {
          id: 's',
          columns: 12,
          colGap: 8,
          rowGap: 8,
          items: [
            { id: 'shown', kind: 'block', x: 0, y: 0, w: 4, h: 2 },
            { id: 'gone', kind: 'block', x: 0, y: 2, w: 4, h: 2, hidden: true },
          ],
        },
      ],
    } as Layout;
  }

  it('does not render a desktop-hidden item when only desktop is enabled', () => {
    const html = renderToStaticMarkup(
      <VantagePreview value={layoutWith(['desktop'])} components={labelled} />,
    );
    expect(html).toContain('<span>shown</span>');
    expect(html).not.toContain('<span>gone</span>');
  });

  it('does not render it when desktop is forced', () => {
    const html = renderToStaticMarkup(
      <VantagePreview
        value={layoutWith(['desktop', 'mobile'])}
        components={labelled}
        breakpoint="desktop"
      />,
    );
    expect(html).not.toContain('<span>gone</span>');
  });

  it('renders it when a smaller breakpoint is forced', () => {
    const html = renderToStaticMarkup(
      <VantagePreview
        value={layoutWith(['desktop', 'mobile'])}
        components={labelled}
        breakpoint="mobile"
      />,
    );
    expect(html).toContain('<span>gone</span>');
  });

  it('hides it with CSS above the widest smaller breakpoint only', () => {
    const html = renderToStaticMarkup(
      <VantagePreview value={layoutWith(['desktop', 'tablet', 'mobile'])} components={labelled} />,
    );
    expect(html).toContain('<span>gone</span>');
    expect(html).toContain('data-vp-hidden="desktop"');
    // The desktop hide rule sits in the desktop range, never outside a container query.
    const css = html.match(/<style>(.*?)<\/style>/)![1];
    expect(css).toMatch(
      /@container \(width > 1023px\)\{[^{}]*\[data-vp-hidden~="desktop"\]\{display:none\}\}/,
    );
    expect(css.match(/data-vp-hidden~="desktop"/g)).toHaveLength(1);
  });
});

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

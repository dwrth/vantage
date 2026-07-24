import type { ItemOverride, Layout, Section, SectionOverride } from 'vantage';

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function remapOverrides(
  overrides: Section['overrides'],
  idMap: Map<string, string>,
): Section['overrides'] {
  if (!overrides) return undefined;
  const next: NonNullable<Section['overrides']> = {};
  for (const [bp, ovr] of Object.entries(overrides) as [
    keyof NonNullable<Section['overrides']>,
    SectionOverride,
  ][]) {
    if (!ovr) continue;
    const items: Record<string, ItemOverride> = {};
    if (ovr.items) {
      for (const [oldId, itemOvr] of Object.entries(ovr.items)) {
        const newId = idMap.get(oldId);
        if (newId) items[newId] = itemOvr;
      }
    }
    next[bp] = { ...ovr, items: Object.keys(items).length ? items : ovr.items };
  }
  return next;
}

function withFreshIds(section: Section): Section {
  const idMap = new Map(section.items.map((item) => [item.id, createId()]));
  return {
    ...section,
    id: createId(),
    items: section.items.map((item) => ({ ...item, id: idMap.get(item.id)! })),
    overrides: remapOverrides(section.overrides, idMap),
  };
}

/**
 * Polished product landing sample.
 * Desktop = 12-col compositions. Mobile = 4-col with intentional reflows
 * (2×2 stats, stacked media, full-bleed CTAs). Tablet enabled as middle ground.
 */
const SAMPLE_SECTIONS = [
  {
    id: 'sec-hero',
    label: 'Hero',
    columns: 12,
    colGap: 16,
    rowGap: 12,
    paddingTop: 56,
    paddingBottom: 56,
    background: {
      color: '#0b1220',
      image: 'https://picsum.photos/seed/v/1600/900',
      imageSize: 'cover',
      imagePosition: 'center',
      blur: 18,
      opacity: 0.45,
    },
    items: [
      {
        id: 'hero-eyebrow',
        kind: 'text',
        x: 0,
        y: 0,
        w: 5,
        h: 1,
        label: 'Eyebrow',
        data: {
          content: 'VANTAGE · LAYOUT BUILDER',
          variant: 'overlay',
          fontSize: 'xs',
          fontWeight: 'semibold',
          align: 'left',
        },
      },
      {
        id: 'hero-title',
        kind: 'text',
        x: 0,
        y: 1,
        w: 7,
        h: 3,
        label: 'Hero title',
        data: {
          title: 'Compose responsive grids without fighting CSS',
          content: 'Drag, resize, and restack blocks. Breakpoints stay in the data model.',
          variant: 'overlay',
          fontSize: '2xl',
          fontWeight: 'bold',
        },
      },
      {
        id: 'hero-body',
        kind: 'text',
        x: 0,
        y: 4,
        w: 6,
        h: 2,
        label: 'Hero body',
        data: {
          content:
            'Ship a controlled layout builder in React. You own the blocks — Vantage owns placement, chrome, and overrides.',
          variant: 'overlay',
          fontSize: 'sm',
        },
      },
      {
        id: 'hero-cta-primary',
        kind: 'button',
        x: 0,
        y: 6,
        w: 3,
        h: 2,
        label: 'Primary CTA',
        data: { cta: 'Load the canvas', align: 'left', vAlign: 'center' },
      },
      {
        id: 'hero-cta-secondary',
        kind: 'button',
        x: 3,
        y: 6,
        w: 3,
        h: 2,
        label: 'Secondary CTA',
        data: { cta: 'Open preview', align: 'left', vAlign: 'center' },
      },
      {
        id: 'hero-visual',
        kind: 'image',
        x: 7,
        y: 0,
        w: 5,
        h: 8,
        label: 'Hero visual',
        ref: 'entity-hero-visual',
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        colGap: 12,
        paddingTop: 40,
        paddingBottom: 40,
        items: {
          'hero-eyebrow': { x: 0, y: 0, w: 5, h: 1 },
          'hero-title': { x: 0, y: 1, w: 8, h: 3 },
          'hero-body': { x: 0, y: 4, w: 5, h: 2 },
          'hero-cta-primary': { x: 0, y: 6, w: 3, h: 2 },
          'hero-cta-secondary': { x: 3, y: 6, w: 3, h: 2 },
          'hero-visual': { x: 5, y: 4, w: 3, h: 4 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 10,
        rowGap: 10,
        paddingTop: 28,
        paddingBottom: 32,
        items: {
          'hero-visual': { x: 0, y: 0, w: 4, h: 5 },
          'hero-eyebrow': { x: 0, y: 5, w: 4, h: 1 },
          'hero-title': {
            x: 0,
            y: 6,
            w: 4,
            h: 4,
            data: { fontSize: 'xl' },
          },
          'hero-body': { x: 0, y: 10, w: 4, h: 3 },
          'hero-cta-primary': { x: 0, y: 13, w: 4, h: 2 },
          'hero-cta-secondary': { x: 0, y: 15, w: 4, h: 2 },
        },
      },
    },
  },
  {
    id: 'sec-stats',
    label: 'Stats',
    columns: 12,
    colGap: 16,
    rowGap: 12,
    paddingTop: 32,
    paddingBottom: 16,
    items: [
      {
        id: 'stat-1',
        kind: 'text',
        x: 0,
        y: 0,
        w: 3,
        h: 3,
        label: 'Stat — blocks',
        data: {
          title: '7 block kinds',
          content: 'Text, image, button, input, form, card, and debug spacer.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'stat-2',
        kind: 'text',
        x: 3,
        y: 0,
        w: 3,
        h: 3,
        label: 'Stat — breakpoints',
        data: {
          title: '3 breakpoints',
          content: 'Desktop base plus tablet and mobile overrides that don’t leak.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'stat-3',
        kind: 'text',
        x: 6,
        y: 0,
        w: 3,
        h: 3,
        label: 'Stat — control',
        data: {
          title: '100% controlled',
          content: 'Layout is plain JSON. Persist, diff, import, export as you like.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'stat-4',
        kind: 'text',
        x: 9,
        y: 0,
        w: 3,
        h: 3,
        label: 'Stat — chrome',
        data: {
          title: 'Host chrome',
          content: 'Layers, inspectors, and toolbars stay in your app — not the library.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'stat-1': { x: 0, y: 0, w: 4, h: 3 },
          'stat-2': { x: 4, y: 0, w: 4, h: 3 },
          'stat-3': { x: 0, y: 3, w: 4, h: 3 },
          'stat-4': { x: 4, y: 3, w: 4, h: 3 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 10,
        rowGap: 10,
        paddingTop: 20,
        paddingBottom: 8,
        items: {
          // 2×2 — not a tall single column
          'stat-1': { x: 0, y: 0, w: 2, h: 4, data: { fontSize: 'base' } },
          'stat-2': { x: 2, y: 0, w: 2, h: 4, data: { fontSize: 'base' } },
          'stat-3': { x: 0, y: 4, w: 2, h: 4, data: { fontSize: 'base' } },
          'stat-4': { x: 2, y: 4, w: 2, h: 4, data: { fontSize: 'base' } },
        },
      },
    },
  },
  {
    id: 'sec-feature',
    label: 'Feature',
    columns: 12,
    colGap: 20,
    rowGap: 12,
    paddingTop: 40,
    paddingBottom: 40,
    items: [
      {
        id: 'feature-image',
        kind: 'image',
        x: 0,
        y: 0,
        w: 6,
        h: 8,
        label: 'Feature image',
        data: {
          content: 'https://picsum.photos/seed/vantage-split/1200/1400',
          label: 'Editor canvas',
        },
      },
      {
        id: 'feature-kicker',
        kind: 'text',
        x: 6,
        y: 0,
        w: 5,
        h: 1,
        label: 'Kicker',
        data: {
          content: 'WHY IT MATTERS',
          fontSize: 'xs',
          fontWeight: 'semibold',
          color: '#0d9488',
        },
      },
      {
        id: 'feature-title',
        kind: 'text',
        x: 6,
        y: 1,
        w: 6,
        h: 2,
        label: 'Feature title',
        data: {
          title: 'One layout model. Every viewport.',
          fontSize: 'xl',
          fontWeight: 'bold',
        },
      },
      {
        id: 'feature-body',
        kind: 'text',
        x: 6,
        y: 3,
        w: 6,
        h: 3,
        label: 'Feature body',
        data: {
          content:
            'Edit on desktop, then switch to mobile and nudge placements without forking the document. Hidden items, section gaps, and data patches all live in overrides.',
          fontSize: 'sm',
        },
      },
      {
        id: 'feature-cta',
        kind: 'button',
        x: 6,
        y: 6,
        w: 3,
        h: 2,
        label: 'Feature CTA',
        data: { cta: 'Try breakpoints', align: 'left' },
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'feature-image': { x: 0, y: 0, w: 4, h: 7 },
          'feature-kicker': { x: 4, y: 0, w: 4, h: 1 },
          'feature-title': { x: 4, y: 1, w: 4, h: 2 },
          'feature-body': { x: 4, y: 3, w: 4, h: 3 },
          'feature-cta': { x: 4, y: 6, w: 3, h: 2 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 10,
        rowGap: 8,
        paddingTop: 24,
        paddingBottom: 24,
        items: {
          'feature-image': { x: 0, y: 0, w: 4, h: 5 },
          'feature-kicker': { x: 0, y: 5, w: 4, h: 1 },
          'feature-title': { x: 0, y: 6, w: 4, h: 3, data: { fontSize: 'lg' } },
          'feature-body': { x: 0, y: 9, w: 4, h: 4 },
          'feature-cta': { x: 0, y: 13, w: 4, h: 2 },
        },
      },
    },
  },
  {
    id: 'sec-gallery',
    label: 'Gallery',
    columns: 12,
    colGap: 8,
    rowGap: 8,
    paddingTop: 24,
    paddingBottom: 24,
    items: [
      {
        id: 'gal-heading',
        kind: 'text',
        x: 0,
        y: 0,
        w: 8,
        h: 2,
        label: 'Gallery heading',
        data: {
          title: 'Visual density without chaos',
          content: 'Overlap captions, stack layers, and keep mobile readable.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'gal-large',
        kind: 'image',
        x: 0,
        y: 2,
        w: 7,
        h: 6,
        label: 'Gallery large',
        data: { content: 'https://picsum.photos/seed/vantage-g-a/1200/900' },
      },
      {
        id: 'gal-top',
        kind: 'image',
        x: 7,
        y: 2,
        w: 5,
        h: 3,
        label: 'Gallery top',
        data: { content: 'https://picsum.photos/seed/vantage-g-b/900/520' },
      },
      {
        id: 'gal-bot',
        kind: 'image',
        x: 7,
        y: 5,
        w: 5,
        h: 3,
        label: 'Gallery bottom',
        data: { content: 'https://picsum.photos/seed/vantage-g-c/900/520' },
      },
      {
        id: 'gal-caption',
        kind: 'text',
        x: 0,
        y: 6,
        w: 5,
        h: 2,
        label: 'Caption overlay',
        data: {
          title: 'Layered captions',
          content: 'Right-click to bring text above media.',
          variant: 'overlay',
          fontSize: 'sm',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'gal-cta',
        kind: 'button',
        x: 9,
        y: 8,
        w: 3,
        h: 2,
        label: 'Gallery CTA',
        data: { cta: 'Browse blocks' },
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'gal-heading': { x: 0, y: 0, w: 8, h: 2 },
          'gal-large': { x: 0, y: 2, w: 5, h: 5 },
          'gal-top': { x: 5, y: 2, w: 3, h: 2 },
          'gal-bot': { x: 5, y: 4, w: 3, h: 3 },
          'gal-caption': { x: 0, y: 5, w: 4, h: 2 },
          'gal-cta': { x: 5, y: 7, w: 3, h: 2 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 8,
        rowGap: 8,
        items: {
          'gal-heading': { x: 0, y: 0, w: 4, h: 3, data: { fontSize: 'base' } },
          'gal-large': { x: 0, y: 3, w: 4, h: 4 },
          'gal-caption': { x: 0, y: 5, w: 4, h: 2 },
          'gal-top': { x: 0, y: 7, w: 2, h: 3 },
          'gal-bot': { x: 2, y: 7, w: 2, h: 3 },
          'gal-cta': { x: 0, y: 10, w: 4, h: 2 },
        },
      },
    },
  },
  {
    id: 'sec-cards',
    label: 'Cards',
    columns: 12,
    colGap: 16,
    rowGap: 12,
    paddingTop: 32,
    paddingBottom: 32,
    items: [
      {
        id: 'card-1',
        kind: 'card',
        x: 0,
        y: 0,
        w: 4,
        h: 8,
        label: 'Card — registry',
        data: {
          image: 'https://picsum.photos/seed/vantage-card-a/800/500',
          imageAlt: 'Abstract UI grid',
          title: 'Define your kinds',
          content: 'Bundle a renderer, defaults, and optional inspector with defineKind.',
          cta: 'See registry',
        },
      },
      {
        id: 'card-2',
        kind: 'card',
        x: 4,
        y: 0,
        w: 4,
        h: 8,
        label: 'Card — preview',
        data: {
          image: 'https://picsum.photos/seed/vantage-card-b/800/500',
          imageAlt: 'Clean preview surface',
          title: 'Preview without chrome',
          content: 'Same layout JSON, zero drag handles. Drop it on /preview or an iframe.',
          cta: 'Open preview',
        },
      },
      {
        id: 'card-3',
        kind: 'card',
        x: 8,
        y: 0,
        w: 4,
        h: 8,
        label: 'Card — layers',
        data: {
          image: 'https://picsum.photos/seed/vantage-card-c/800/500',
          imageAlt: 'Stacked layers',
          title: 'Own the panels',
          content: 'Layers, context menus, and section inspectors are host UI on pure helpers.',
          cta: 'Inspect layers',
        },
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'card-1': { x: 0, y: 0, w: 4, h: 8 },
          'card-2': { x: 4, y: 0, w: 4, h: 8 },
          'card-3': { x: 2, y: 8, w: 4, h: 8 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 10,
        rowGap: 12,
        paddingTop: 16,
        paddingBottom: 16,
        items: {
          'card-1': { x: 0, y: 0, w: 4, h: 8 },
          'card-2': { x: 0, y: 8, w: 4, h: 8 },
          'card-3': { x: 0, y: 16, w: 4, h: 8 },
        },
      },
    },
  },
  {
    id: 'sec-newsletter',
    label: 'Newsletter',
    columns: 12,
    colGap: 12,
    rowGap: 12,
    paddingTop: 48,
    paddingBottom: 56,
    background: {
      color: '#ecfeff',
      image: 'https://picsum.photos/seed/vantage-newsletter/1600/900',
      imageSize: 'cover',
      imagePosition: 'center',
      blur: 8,
      opacity: 1,
      parallax: true,
    },
    items: [
      {
        id: 'news-copy',
        kind: 'text',
        x: 2,
        y: 0,
        w: 8,
        h: 2,
        label: 'Newsletter heading',
        data: {
          title: 'Ship the next layout faster',
          content: 'A short demo digest — breakpoints, blocks, and host patterns.',
          fontSize: 'xl',
          fontWeight: 'bold',
          align: 'center',
          variant: 'overlay',
        },
      },
      {
        id: 'news-form',
        kind: 'form',
        x: 3,
        y: 2,
        w: 6,
        h: 4,
        label: 'Newsletter form',
        data: {
          title: 'Stay in the loop',
          content: 'No spam. Just release notes and layout recipes.',
          placeholder: 'you@studio.dev',
          cta: 'Subscribe',
        },
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'news-copy': { x: 1, y: 0, w: 6, h: 2 },
          'news-form': { x: 1, y: 2, w: 6, h: 4 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 8,
        rowGap: 8,
        paddingTop: 28,
        paddingBottom: 32,
        items: {
          'news-copy': {
            x: 0,
            y: 0,
            w: 4,
            h: 3,
            data: { fontSize: 'lg', align: 'left' },
          },
          'news-form': { x: 0, y: 3, w: 4, h: 5 },
        },
      },
    },
  },
  {
    id: 'sec-sandbox',
    label: 'Sandbox',
    columns: 12,
    colGap: 12,
    rowGap: 10,
    paddingTop: 32,
    paddingBottom: 40,
    items: [
      {
        id: 'sandbox-heading',
        kind: 'text',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
        label: 'Sandbox heading',
        data: {
          title: 'Component sandbox',
          content: 'Inputs, buttons, cards, and spacer blocks — resize and restack freely.',
          fontSize: 'lg',
          fontWeight: 'semibold',
        },
      },
      {
        id: 'sandbox-input-a',
        kind: 'input',
        x: 0,
        y: 2,
        w: 4,
        h: 3,
        label: 'Input A',
        data: { title: 'Project name', placeholder: 'aurora-grid' },
      },
      {
        id: 'sandbox-input-b',
        kind: 'input',
        x: 4,
        y: 2,
        w: 4,
        h: 3,
        label: 'Input B',
        data: { title: 'Breakpoint', placeholder: 'mobile' },
      },
      {
        id: 'sandbox-button',
        kind: 'button',
        x: 8,
        y: 2,
        w: 4,
        h: 3,
        label: 'Sandbox button',
        data: { cta: 'Apply layout' },
      },
      {
        id: 'sandbox-card',
        kind: 'card',
        x: 0,
        y: 5,
        w: 5,
        h: 7,
        label: 'Sandbox card',
        data: {
          image: 'https://picsum.photos/seed/vantage-sandbox/800/500',
          imageAlt: 'Workspace desk',
          title: 'Stateful form nearby',
          content: 'Interactive blocks stop pointer events so dnd-kit doesn’t steal clicks.',
          cta: 'Learn more',
        },
      },
      {
        id: 'sandbox-block-a',
        kind: 'block',
        x: 5,
        y: 5,
        w: 3,
        h: 2,
        label: 'Spacer A',
        data: {},
      },
      {
        id: 'sandbox-block-b',
        kind: 'block',
        x: 8,
        y: 5,
        w: 4,
        h: 2,
        label: 'Spacer B',
        data: {},
      },
      {
        id: 'sandbox-block-c',
        kind: 'block',
        x: 5,
        y: 7,
        w: 7,
        h: 5,
        label: 'Spacer C',
        data: {},
      },
    ],
    overrides: {
      tablet: {
        columns: 8,
        items: {
          'sandbox-heading': { x: 0, y: 0, w: 8, h: 2 },
          'sandbox-input-a': { x: 0, y: 2, w: 4, h: 3 },
          'sandbox-input-b': { x: 4, y: 2, w: 4, h: 3 },
          'sandbox-button': { x: 0, y: 5, w: 4, h: 2 },
          'sandbox-card': { x: 0, y: 7, w: 4, h: 7 },
          'sandbox-block-a': { x: 4, y: 5, w: 4, h: 2 },
          'sandbox-block-b': { x: 4, y: 7, w: 4, h: 2 },
          'sandbox-block-c': { x: 4, y: 9, w: 4, h: 5 },
        },
      },
      mobile: {
        columns: 4,
        colGap: 8,
        rowGap: 8,
        items: {
          'sandbox-heading': { x: 0, y: 0, w: 4, h: 3, data: { fontSize: 'base' } },
          'sandbox-input-a': { x: 0, y: 3, w: 4, h: 3 },
          'sandbox-input-b': { x: 0, y: 6, w: 4, h: 3 },
          'sandbox-button': { x: 0, y: 9, w: 4, h: 2 },
          'sandbox-card': { x: 0, y: 11, w: 4, h: 8 },
          // keep spacers visible but compact; hide the tall one
          'sandbox-block-a': { x: 0, y: 19, w: 2, h: 2 },
          'sandbox-block-b': { x: 2, y: 19, w: 2, h: 2 },
          'sandbox-block-c': { hidden: true },
        },
      },
    },
  },
] as Section[];

export function createSampleLayout(): Layout {
  return {
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: { mobile: 640, tablet: 1023 },
    breakpointPreviewWidths: { mobile: 390, tablet: 768 },
    sections: SAMPLE_SECTIONS.map(withFreshIds),
  };
}

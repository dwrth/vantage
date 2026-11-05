// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemDataProvider } from '../hooks/useItemData';
import type {
  ComponentRegistry,
  GridItem,
  InspectorProps,
  ItemDataChangeEvent,
  Layout,
} from '../types';
import { VantageInspector, type VantageInspectorProps } from './VantageInspector';

afterEach(cleanup);

type Data = { title?: string; tone?: string };

function TitleInspector({ item, resolvedData, activeBreakpoint, onChange }: InspectorProps<Data>) {
  return (
    <div>
      <output aria-label="title">{resolvedData.title}</output>
      <output aria-label="tone">{resolvedData.tone}</output>
      <output aria-label="item">{item.id}</output>
      <output aria-label="bp">{activeBreakpoint}</output>
      <button onClick={() => onChange({ title: 'new' })}>active</button>
      <button onClick={() => onChange({ title: 'base', tone: 'x' }, { scope: 'base' })}>
        base
      </button>
      <button onClick={() => onChange({ tone: 'clean' }, { dirty: false })}>clean</button>
    </div>
  );
}

const components: ComponentRegistry = {
  text: {
    component: () => null,
    inspector: TitleInspector as ComponentRegistry[string]['inspector'],
    defaults: { w: 1, h: 1 },
  },
  plain: { component: () => null, defaults: { w: 1, h: 1 } },
};

const item = (id: string, kind: string, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  ...extra,
});

const layout: Layout = {
  breakpoints: ['desktop', 'tablet'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 8,
      rowGap: 8,
      rows: 4,
      items: [
        item('t', 'text', { data: { title: 'hello' } }),
        item('p', 'plain'),
        item('u', 'ghost'),
      ],
    },
  ],
};

const selectText = { sectionId: 's', itemId: 't' };

function setup(props: Partial<VantageInspectorProps> = {}) {
  const onChange = vi.fn();
  const view = render(
    <VantageInspector
      layout={layout}
      components={components}
      selection={selectText}
      activeBreakpoint="desktop"
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...view };
}

describe('VantageInspector empty state', () => {
  it('prompts for a selection when nothing is selected', () => {
    setup({ selection: null });
    expect(screen.getByText('Select a block to inspect settings.')).toBeTruthy();
  });

  it('shows the custom empty state', () => {
    setup({ selection: null, emptyState: <p>nothing here</p> });
    expect(screen.getByText('nothing here')).toBeTruthy();
    expect(screen.queryByText('Select a block to inspect settings.')).toBeNull();
  });

  it.each([
    ['section', { sectionId: 'missing', itemId: 't' }],
    ['item', { sectionId: 's', itemId: 'missing' }],
  ])('treats an unknown %s as no selection', (_name, selection) => {
    setup({ selection });
    expect(screen.getByText('Select a block to inspect settings.')).toBeTruthy();
  });

  it('applies className on the root with and without a selection', () => {
    const empty = setup({ selection: null, className: 'host' });
    expect(empty.container.firstElementChild!.className).toBe('vantage-root host');
    cleanup();
    const selected = setup({ className: 'host' });
    expect(selected.container.firstElementChild!.className).toBe('vantage-root host');
  });
});

describe('VantageInspector selection', () => {
  it('shows the kind as header and passes resolved data to the kind inspector', () => {
    setup();
    expect(screen.getByText('text')).toBeTruthy();
    expect(screen.getByLabelText('title').textContent).toBe('hello');
    expect(screen.getByLabelText('item').textContent).toBe('t');
    expect(screen.getByLabelText('bp').textContent).toBe('desktop');
  });

  it('uses renderHeader with the resolved selection', () => {
    setup({
      renderHeader: ({ item: it, section, activeBreakpoint }) => (
        <h2>{`${it.id}/${section.id}/${activeBreakpoint}`}</h2>
      ),
    });
    expect(screen.getByRole('heading').textContent).toBe('t/s/desktop');
    expect(screen.queryByText('text')).toBeNull();
  });

  it('says so when the kind has no inspector', () => {
    setup({ selection: { sectionId: 's', itemId: 'p' } });
    expect(screen.getByText(/No inspector for/).textContent).toBe('No inspector for plain.');
  });

  it('says so when the kind is not registered', () => {
    setup({ selection: { sectionId: 's', itemId: 'u' } });
    expect(screen.getByText(/No inspector for/).textContent).toBe('No inspector for ghost.');
  });

  it('merges entity data from ItemDataProvider under the layout data', () => {
    const resolveItemData = vi.fn(() => ({ title: 'entity', tone: 'warm' }));
    render(
      <ItemDataProvider resolveItemData={resolveItemData}>
        <VantageInspector
          layout={layout}
          components={components}
          selection={selectText}
          activeBreakpoint="desktop"
          onChange={vi.fn()}
        />
      </ItemDataProvider>,
    );
    expect(resolveItemData).toHaveBeenCalledWith(expect.objectContaining({ id: 't' }));
    expect(screen.getByLabelText('title').textContent).toBe('hello');
    expect(screen.getByLabelText('tone').textContent).toBe('warm');
  });

  it('resolves tablet data from the tablet override', () => {
    const withOverride: Layout = {
      ...layout,
      sections: [
        {
          ...layout.sections[0]!,
          overrides: { tablet: { items: { t: { data: { title: 'tablet title' } } } } },
        },
      ],
    };
    setup({ layout: withOverride, activeBreakpoint: 'tablet' });
    expect(screen.getByLabelText('title').textContent).toBe('tablet title');
    expect(screen.getByLabelText('bp').textContent).toBe('tablet');
  });
});

describe('VantageInspector edits', () => {
  it('writes a desktop patch into the item and emits layout, changeset and merge key', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByText('active'));
    const [next, changeset, options] = onChange.mock.calls[0]!;
    expect(next.sections[0].items[0].data).toEqual({ title: 'new' });
    expect(next.sections[0].items[1]).toBe(layout.sections[0]!.items[1]);
    expect(changeset.itemsUpdated).toHaveLength(1);
    expect(changeset.itemsUpdated[0]).toMatchObject({
      sectionId: 's',
      item: { id: 't', data: { title: 'new' } },
    });
    expect(options).toEqual({ mergeKey: 'vantage-inspector:s:t:desktop:title' });
  });

  it('writes the patch into the tablet override at a non-desktop breakpoint', () => {
    const { onChange } = setup({ activeBreakpoint: 'tablet' });
    fireEvent.click(screen.getByText('active'));
    const [next, , options] = onChange.mock.calls[0]!;
    expect(next.sections[0].items[0].data).toEqual({ title: 'hello' });
    expect(next.sections[0].overrides.tablet.items.t.data).toEqual({ title: 'new' });
    expect(options.mergeKey).toBe('vantage-inspector:s:t:tablet:title');
  });

  it('base scope writes to desktop even when another breakpoint is active', () => {
    const { onChange } = setup({ activeBreakpoint: 'tablet' });
    fireEvent.click(screen.getByText('base'));
    const [next, , options] = onChange.mock.calls[0]!;
    expect(next.sections[0].items[0].data).toEqual({ title: 'base', tone: 'x' });
    expect(options.mergeKey).toBe('vantage-inspector:s:t:desktop:title,tone');
  });

  it('reports the edit through onItemDataChange with scope and dirty flag', () => {
    const onItemDataChange = vi.fn<(event: ItemDataChangeEvent) => void>();
    setup({ activeBreakpoint: 'tablet', onItemDataChange });
    fireEvent.click(screen.getByText('active'));
    fireEvent.click(screen.getByText('base'));
    fireEvent.click(screen.getByText('clean'));
    expect(onItemDataChange.mock.calls.map(([e]) => e)).toEqual([
      {
        sectionId: 's',
        itemId: 't',
        patch: { title: 'new' },
        breakpoint: 'tablet',
        scope: 'active',
        dirty: true,
      },
      {
        sectionId: 's',
        itemId: 't',
        patch: { title: 'base', tone: 'x' },
        breakpoint: 'desktop',
        scope: 'base',
        dirty: true,
      },
      {
        sectionId: 's',
        itemId: 't',
        patch: { tone: 'clean' },
        breakpoint: 'tablet',
        scope: 'active',
        dirty: false,
      },
    ]);
  });

  it('works without onItemDataChange', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByText('clean'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

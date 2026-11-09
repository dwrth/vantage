// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantagePreview } from './VantagePreview';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};
const empty = { breakpoints: ['desktop'], sections: [] } as unknown as Layout;

describe('VantagePreview emptyState (client render)', () => {
  it('keeps the default hint when emptyState is omitted', () => {
    render(<VantagePreview value={empty} components={components} />);
    expect(screen.getByText('Nothing to preview yet.')).toBeTruthy();
  });

  it('renders an empty root when emptyState is null', () => {
    const { container } = render(
      <VantagePreview value={empty} components={components} emptyState={null} />,
    );
    expect(screen.queryByText('Nothing to preview yet.')).toBeNull();
    expect(container.firstElementChild?.childElementCount).toBe(0);
    expect(container.textContent).toBe('');
  });

  it('renders the custom emptyState', () => {
    render(
      <VantagePreview
        value={empty}
        components={components}
        emptyState={<span>Noch keine Inhalte</span>}
      />,
    );
    expect(screen.getByText('Noch keine Inhalte')).toBeTruthy();
    expect(screen.queryByText('Nothing to preview yet.')).toBeNull();
  });
});

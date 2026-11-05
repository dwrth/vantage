// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVantageInteractiveTarget } from '../lib/interactive';
import { VantageInteractive } from './VantageInteractive';

afterEach(cleanup);

describe('VantageInteractive', () => {
  it('marks its subtree so drags do not start from it', () => {
    render(
      <VantageInteractive data-testid="zone">
        <span>inner</span>
      </VantageInteractive>,
    );
    expect(screen.getByTestId('zone').hasAttribute('data-vantage-interactive')).toBe(true);
    expect(isVantageInteractiveTarget(screen.getByText('inner'))).toBe(true);
  });

  it('forwards props and handlers to the div', () => {
    const onClick = vi.fn();
    render(
      <VantageInteractive className="x" aria-label="zone" onClick={onClick}>
        hit
      </VantageInteractive>,
    );
    const zone = screen.getByLabelText('zone');
    expect(zone.tagName).toBe('DIV');
    expect(zone.className).toBe('x');
    fireEvent.click(zone);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

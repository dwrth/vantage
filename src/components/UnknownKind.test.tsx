// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UnknownKind } from './UnknownKind';

afterEach(cleanup);

describe('UnknownKind', () => {
  it('names the unregistered kind', () => {
    render(<UnknownKind item={{ id: 'a', kind: 'mystery', x: 0, y: 0, w: 1, h: 1 }} />);
    expect(screen.getByText('mystery').tagName).toBe('STRONG');
    expect(screen.getByText(/Unknown kind:/)).toBeTruthy();
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Builder.tsx sets `data-vantage-dragging` on the root while anything is dragged or resized.
const GUARD = ':hover:where(:not([data-vantage-dragging] *))';

/** Every selector in a stylesheet that contains `:hover`. */
function hoverSelectors(file: string): string[] {
  const css = readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.includes(':hover'));
}

describe('hover styles are off while dragging', () => {
  it.each([['./grid-block.module.css'], ['./builder.module.css']])('%s', (file) => {
    const unguarded = hoverSelectors(file).filter(
      (s) =>
        !s.startsWith('.canvas-empty') && // empty canvas: nothing to drag
        s.split(':hover').length !== s.split(GUARD).length,
    );
    expect(unguarded).toEqual([]);
  });

  it('finds the guarded selectors (sanity check)', () => {
    expect(hoverSelectors('./grid-block.module.css').length).toBeGreaterThan(10);
    expect(hoverSelectors('./builder.module.css').some((s) => s.includes(GUARD))).toBe(true);
  });
});

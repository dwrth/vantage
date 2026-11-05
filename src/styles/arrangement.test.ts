import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  fileURLToPath(new URL('./arrangement.module.css', import.meta.url)),
  'utf8',
);

const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
};

describe('arrangement block surface', () => {
  const body = rule('.cell > .body');

  it('stretches the block across its cell whatever align-self the kind sets', () => {
    expect(body).toMatch(/align-self:\s*stretch/);
    expect(body).toMatch(/width:\s*100%/);
  });

  it('keeps blocks as tall as their content', () => {
    expect(body).toMatch(/min-height:\s*3rem/);
    expect(body).toMatch(/overflow:\s*visible/);
    expect(body).toMatch(/contain:\s*none/);
  });
});

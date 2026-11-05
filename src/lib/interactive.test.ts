// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  VANTAGE_DRAG_HANDLE_ATTR,
  VANTAGE_INTERACTIVE_ATTR,
  isVantageInteractiveTarget,
  shouldPreventDragActivation,
} from './interactive';

const mount = (html: string) => {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isVantageInteractiveTarget', () => {
  it('is false for null and non-Element targets', () => {
    expect(isVantageInteractiveTarget(null)).toBe(false);
    expect(isVantageInteractiveTarget(document)).toBe(false);
    expect(isVantageInteractiveTarget(window)).toBe(false);
  });

  it.each(['a', 'button', 'input', 'textarea', 'select', 'option', 'label'])(
    'is true for <%s>',
    (tag) => {
      expect(isVantageInteractiveTarget(document.createElement(tag))).toBe(true);
    },
  );

  it('is true for descendants of interactive elements', () => {
    const root = mount('<button><span id="x"></span></button>');
    expect(isVantageInteractiveTarget(root.querySelector('#x'))).toBe(true);
  });

  it('matches contenteditable true and empty but not false', () => {
    const root = mount(
      '<div id="t" contenteditable="true"></div><div id="e" contenteditable=""></div><div id="f" contenteditable="false"></div>',
    );
    expect(isVantageInteractiveTarget(root.querySelector('#t'))).toBe(true);
    expect(isVantageInteractiveTarget(root.querySelector('#e'))).toBe(true);
    expect(isVantageInteractiveTarget(root.querySelector('#f'))).toBe(false);
  });

  it('matches the interactive attribute on an ancestor', () => {
    const root = mount(`<div ${VANTAGE_INTERACTIVE_ATTR}><p id="x"></p></div>`);
    expect(isVantageInteractiveTarget(root.querySelector('#x'))).toBe(true);
  });

  it('is false for plain elements', () => {
    const root = mount('<div><p id="x"></p></div>');
    expect(isVantageInteractiveTarget(root.querySelector('#x'))).toBe(false);
  });
});

describe('shouldPreventDragActivation', () => {
  it('is false for non-Element targets', () => {
    expect(shouldPreventDragActivation(null, null)).toBe(false);
    expect(shouldPreventDragActivation(document, null)).toBe(false);
  });

  it('is false for non-interactive targets', () => {
    const root = mount('<div id="x"></div>');
    expect(shouldPreventDragActivation(root.querySelector('#x'), null)).toBe(false);
  });

  it('is true for an interactive target when the activator is not interactive', () => {
    const root = mount('<div id="cell"><input id="in" /></div>');
    const input = root.querySelector('#in');
    expect(shouldPreventDragActivation(input, root.querySelector('#cell'))).toBe(true);
    expect(shouldPreventDragActivation(input, null)).toBe(true);
    expect(shouldPreventDragActivation(input, window)).toBe(true);
  });

  it('is false when the activator itself is interactive', () => {
    const root = mount('<button id="handle"><span id="icon"></span></button>');
    const handle = root.querySelector('#handle');
    expect(shouldPreventDragActivation(handle, handle)).toBe(false);
    expect(shouldPreventDragActivation(root.querySelector('#icon'), handle)).toBe(false);
  });

  it('is false for targets inside a drag handle even when interactive', () => {
    const root = mount(`<div ${VANTAGE_DRAG_HANDLE_ATTR}><button id="b"></button></div>`);
    expect(shouldPreventDragActivation(root.querySelector('#b'), null)).toBe(false);
  });
});

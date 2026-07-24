export const VANTAGE_INTERACTIVE_ATTR = 'data-vantage-interactive';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'label',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  `[${VANTAGE_INTERACTIVE_ATTR}]`,
].join(',');

/** True when the event target is (or is inside) a control that must not start a drag. */
export function isVantageInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

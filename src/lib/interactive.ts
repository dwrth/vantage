export const VANTAGE_INTERACTIVE_ATTR = 'data-vantage-interactive';
export const VANTAGE_DRAG_HANDLE_ATTR = 'data-vantage-drag-handle';

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

/**
 * Whether PointerSensor should refuse activation.
 * Drag handles may be `<button>` — allow when the activator node itself is interactive,
 * or when the target is inside `[data-vantage-drag-handle]`.
 */
export function shouldPreventDragActivation(
  target: EventTarget | null,
  activator: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(`[${VANTAGE_DRAG_HANDLE_ATTR}]`)) return false;
  if (!isVantageInteractiveTarget(target)) return false;
  // Built-in / custom handle: listeners live on an interactive node (e.g. button).
  if (activator instanceof Element && isVantageInteractiveTarget(activator)) return false;
  return true;
}

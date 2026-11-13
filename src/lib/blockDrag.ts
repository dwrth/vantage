import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { GridItem } from '../types';
import type { ResolvedItemLayout } from './breakpoint';
import type { ClientPoint } from './dropTargeting';
import { shouldPreventDragActivation } from './interactive';
import { trackPointerDrag } from './pointerDrag';

export type BlockDragData = {
  type: 'block';
  item: GridItem;
  sectionId: string;
  placement: Pick<ResolvedItemLayout, 'x' | 'y' | 'w' | 'h'>;
};

export type DragRect = { left: number; top: number; width: number; height: number };

/** Pointer travel before a press on a handle becomes a drag, so a click stays a click. */
export const DRAG_ACTIVATION_DISTANCE = 4;

export type BlockDragEvent = {
  data: BlockDragData;
  /** Where the pointer went down (client coordinates). */
  origin: ClientPoint;
  /** Element the pointer went down on. */
  target: Element;
  /**
   * Pointer travel plus the scroll of the block's scroll containers since the drag started, i.e.
   * how far the block moved in content coordinates. This is the block's drag transform.
   */
  delta: ClientPoint;
  /** The block's rect at drag start moved by the pointer travel only (client coordinates). */
  rect: DragRect | null;
};

export type BlockDragHandlers = {
  onDragStart: (event: BlockDragEvent) => void;
  onDragMove: (event: BlockDragEvent) => void;
  onDragEnd: (event: BlockDragEvent) => void;
  onDragCancel: () => void;
};

/** Spread on a drag handle to let it start a block drag. */
export type BlockDragListeners = {
  onPointerDown: (event: ReactPointerEvent) => void;
};

/** Spread on a drag handle next to its listeners. */
export type BlockDragAttributes = {
  role: 'button';
  tabIndex: number;
  'aria-pressed': true | undefined;
};

type ActiveDrag = { id: string; transform: ClientPoint };

type DragStore = {
  get: () => ActiveDrag | null;
  set: (next: ActiveDrag | null) => void;
  subscribe: (listener: () => void) => () => void;
};

function createStore(): DragStore {
  let state: ActiveDrag | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

type BlockDragContextValue = {
  store: DragStore;
  begin: (
    id: string,
    getData: () => BlockDragData,
    node: HTMLElement | null,
    event: ReactPointerEvent,
  ) => void;
};

export const BlockDragContext = createContext<BlockDragContextValue | null>(null);

/** Ancestors whose scrolling moves `node`; the page itself is read from `window`. */
function scrollContainers(node: Element): Element[] {
  const page = document.scrollingElement ?? document.documentElement;
  const out: Element[] = [];
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (el === page || el === document.body) continue;
    const { overflow, overflowX, overflowY } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflow + overflowX + overflowY)) out.push(el);
  }
  return out;
}

function scrollOffset(containers: Element[]): ClientPoint {
  let x = window.scrollX;
  let y = window.scrollY;
  for (const el of containers) {
    x += el.scrollLeft;
    y += el.scrollTop;
  }
  return { x, y };
}

const preventDefault = (e: Event) => e.preventDefault();
const clearSelection = () => {
  const selection = window.getSelection();
  if (selection?.rangeCount) selection.removeAllRanges();
};
const swallowClick = (e: Event) => e.stopPropagation();

/**
 * Drives block drags for everything under the returned context: one drag at a time, started from
 * a handle's `onPointerDown` once the pointer travelled `DRAG_ACTIVATION_DISTANCE`. Escape and
 * `pointercancel` cancel it.
 */
export function useBlockDragController(handlers: BlockDragHandlers): BlockDragContextValue {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  const [store] = useState(createStore);
  const cancelActive = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelActive.current?.(), []);

  const begin = useCallback<BlockDragContextValue['begin']>(
    (id, getData, node, e) => {
      const native = e.nativeEvent;
      if (cancelActive.current || !native.isPrimary || native.button !== 0) return;
      if (shouldPreventDragActivation(native.target, e.currentTarget)) return;

      const origin = { x: native.clientX, y: native.clientY };
      const target = native.target as Element;
      let pointer = origin;
      let started: { rect: DragRect | null; containers: Element[]; scroll: ClientPoint } | null =
        null;

      const current = (): BlockDragEvent => {
        const travel = { x: pointer.x - origin.x, y: pointer.y - origin.y };
        const scroll = scrollOffset(started!.containers);
        const rect = started!.rect;
        return {
          data: getData(),
          origin,
          target,
          delta: {
            x: travel.x + scroll.x - started!.scroll.x,
            y: travel.y + scroll.y - started!.scroll.y,
          },
          rect: rect && { ...rect, left: rect.left + travel.x, top: rect.top + travel.y },
        };
      };
      const update = () => {
        const event = current();
        store.set({ id, transform: event.delta });
        handlersRef.current.onDragMove(event);
      };

      const listen = (on: boolean) => {
        const method = on ? 'addEventListener' : 'removeEventListener';
        window[method]('scroll', update, true);
        window[method]('dragstart', preventDefault);
        window[method]('contextmenu', preventDefault);
        document[method]('selectionchange', clearSelection);
      };

      const start = () => {
        const box = node?.getBoundingClientRect();
        const containers = scrollContainers(node ?? target);
        started = {
          rect: box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null,
          containers,
          scroll: scrollOffset(containers),
        };
        clearSelection();
        listen(true);
        // A drag that ends on its handle must not click it.
        document.addEventListener('click', swallowClick, true);
        store.set({ id, transform: { x: 0, y: 0 } });
        handlersRef.current.onDragStart(current());
      };

      cancelActive.current = trackPointerDrag(e, {
        onMove: (ev) => {
          pointer = { x: ev.clientX, y: ev.clientY };
          if (!started) {
            const distance = Math.hypot(pointer.x - origin.x, pointer.y - origin.y);
            if (distance < DRAG_ACTIVATION_DISTANCE) return;
            start();
          }
          if (ev.cancelable) ev.preventDefault();
          update();
        },
        onEnd: (cancelled) => {
          cancelActive.current = null;
          if (!started) return;
          const event = current();
          listen(false);
          setTimeout(() => document.removeEventListener('click', swallowClick, true), 50);
          store.set(null);
          if (cancelled) handlersRef.current.onDragCancel();
          else handlersRef.current.onDragEnd(event);
        },
      });
    },
    [store],
  );

  return useMemo(() => ({ store, begin }), [store, begin]);
}

const noSubscription = () => () => {};

/** Makes a block draggable by the handle its `listeners` are spread on. */
export function useBlockDrag(id: string, data: BlockDragData) {
  const ctx = useContext(BlockDragContext);
  const node = useRef<HTMLElement | null>(null);
  const setNodeRef = useCallback((el: HTMLElement | null) => {
    node.current = el;
  }, []);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });

  const readTransform = () => {
    const active = ctx?.store.get();
    return active?.id === id ? active.transform : null;
  };
  const transform = useSyncExternalStore(
    ctx?.store.subscribe ?? noSubscription,
    readTransform,
    readTransform,
  );
  const isDragging = transform !== null;

  const listeners = useMemo<BlockDragListeners>(
    () => ({
      onPointerDown: (e) => ctx?.begin(id, () => dataRef.current, node.current, e),
    }),
    [ctx, id],
  );
  const attributes = useMemo<BlockDragAttributes>(
    () => ({ role: 'button', tabIndex: 0, 'aria-pressed': isDragging ? true : undefined }),
    [isDragging],
  );

  return { listeners, attributes, setNodeRef, transform, isDragging };
}

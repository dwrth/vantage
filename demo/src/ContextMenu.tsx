import { useEffect, useRef } from 'react';

export type ContextMenuItem =
  | { separator: true }
  | {
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      checked?: boolean;
    };

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <ul
      ref={menuRef}
      className="menu menu-sm fixed z-50 min-w-44 rounded-box border border-base-300 bg-base-200 p-1 shadow-lg"
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) =>
        'separator' in item ? (
          <li key={`sep-${index}`}>
            <div className="divider my-0.5 h-px p-0" role="separator" />
          </li>
        ) : (
          <li key={item.label} role="none" className={item.disabled ? 'menu-disabled' : ''}>
            <button
              type="button"
              role="menuitem"
              className={item.checked ? 'menu-active' : ''}
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                onClose();
              }}
            >
              {item.checked ? '✓ ' : ''}
              {item.label}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

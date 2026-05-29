import { useEffect, useRef } from 'react';
import s from './contextMenu.module.css';

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
      className={s.menu}
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) =>
        'separator' in item ? (
          <li key={`sep-${index}`} className={s.separator} role="separator" />
        ) : (
          <li key={item.label} role="none">
            <button
              type="button"
              className={[s.item, item.checked ? s.itemChecked : ''].filter(Boolean).join(' ')}
              role="menuitem"
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                onClose();
              }}
            >
              {item.label}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

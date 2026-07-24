import type { HTMLAttributes, ReactNode } from 'react';

type VantageInteractiveProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

/** Marks a custom clickable region so the builder PointerSensor will not activate a drag. */
export function VantageInteractive({ children, ...rest }: VantageInteractiveProps) {
  return (
    <div data-vantage-interactive="" {...rest}>
      {children}
    </div>
  );
}

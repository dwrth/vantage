import { useLayoutEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(w);
    });
    ro.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return { containerRef, containerWidth };
}

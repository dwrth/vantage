import { createElement, useMemo } from 'react';
import {
  getEnabledBreakpoints,
  resolveBreakpointFromLayout,
  resolveItem,
  resolveItemData,
  resolveSection,
} from '../lib/breakpoint';
import { resolveRenderer, resolveRegistry } from '../lib/registry';
import { useContainerWidth } from '../hooks/useContainerWidth';
import type {
  Breakpoint,
  ComponentRegistry,
  GridItem,
  Layout,
  ResolvedComponentRegistry,
  Section,
} from '../types';
import { vantageRootProps } from '../theme/applyRoot';
import { useVantageTokens } from '../theme/useVantageTokens';
import '../styles/tokens.css';
import preview from '../styles/preview.module.css';
import { SectionBackground } from './SectionBackground';

export type VantagePreviewProps = {
  value: Layout;
  components: ComponentRegistry;
  className?: string;
  /** When set, forces a breakpoint instead of auto-detecting from container width. */
  breakpoint?: Breakpoint;
};

type PreviewItemProps = {
  item: GridItem;
  placement: ReturnType<typeof resolveItem>;
  components: ResolvedComponentRegistry;
};

function PreviewItem({ item, placement, components }: PreviewItemProps) {
  const Renderer = resolveRenderer(components, item, 'preview');
  const descriptor = components[item.kind];
  const kindClass = descriptor?.previewWrapperClass ?? '';

  const style: React.CSSProperties = {
    gridColumn: `${placement.x + 2} / span ${placement.w}`,
    gridRow: `${placement.y + 1} / span ${placement.h}`,
  };

  return (
    <div className={[preview['preview-block'], kindClass].filter(Boolean).join(' ')} style={style}>
      {createElement(Renderer, { item })}
    </div>
  );
}

type PreviewSectionProps = {
  section: Section;
  breakpoint: Breakpoint;
  enabledBreakpoints: Breakpoint[];
  components: ResolvedComponentRegistry;
};

function PreviewSection({
  section,
  breakpoint,
  enabledBreakpoints,
  components,
}: PreviewSectionProps) {
  const resolved = resolveSection(section, breakpoint, enabledBreakpoints);

  return (
    <div className={preview['preview-section']}>
      <div
        className={preview['preview-grid']}
        style={
          {
            '--cols': resolved.columns,
            '--col-gap-px': `${resolved.colGap}px`,
            '--row-gap-px': `${resolved.rowGap}px`,
            '--section-pad-top-px': `${resolved.paddingTop}px`,
            '--section-pad-bottom-px': `${resolved.paddingBottom}px`,
          } as React.CSSProperties
        }
      >
        <SectionBackground
          background={section.background}
          className={preview['preview-section__bg']}
        />
        {section.items.map((item) => {
          const placement = resolveItem(item, section, breakpoint, enabledBreakpoints);
          if (placement.hidden) return null;
          const resolvedItem = {
            ...item,
            data: resolveItemData(item, section, breakpoint, enabledBreakpoints),
          };
          return (
            <PreviewItem
              key={item.id}
              item={resolvedItem}
              placement={placement}
              components={components}
            />
          );
        })}
      </div>
    </div>
  );
}

export function VantagePreview({
  value,
  components: componentsProp,
  className,
  breakpoint: breakpointProp,
}: VantagePreviewProps) {
  const components = useMemo(() => resolveRegistry(componentsProp), [componentsProp]);
  const enabledBreakpoints = useMemo(() => getEnabledBreakpoints(value), [value]);
  const { containerRef, containerWidth } = useContainerWidth<HTMLDivElement>();
  const autoBreakpoint = resolveBreakpointFromLayout(containerWidth, value);
  const breakpoint =
    breakpointProp && enabledBreakpoints.includes(breakpointProp) ? breakpointProp : autoBreakpoint;

  const registryEmpty = Object.keys(components).length === 0;
  const tokens = useVantageTokens();
  const root = vantageRootProps(tokens, [preview.preview, className].filter(Boolean).join(' '));

  return (
    <div ref={containerRef} className={root.className} style={root.style}>
      {registryEmpty ? (
        <div className={preview['preview-empty']}>
          <p>No components registered.</p>
        </div>
      ) : value.sections.length === 0 ? (
        <div className={preview['preview-empty']}>
          <p>Nothing to preview yet.</p>
        </div>
      ) : (
        value.sections.map((section) => (
          <PreviewSection
            key={section.id}
            section={section}
            breakpoint={breakpoint}
            enabledBreakpoints={enabledBreakpoints}
            components={components}
          />
        ))
      )}
    </div>
  );
}

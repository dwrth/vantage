import { useMemo } from 'react';
import { resolveItem, resolveSection, type InspectorProps } from 'vantage';
import { ImageFocalPointControl } from './ImageFocalPointControl';
import { gridItemViewportAspectRatio, type ImageObjectFit } from './imageDisplay';
import type { ImageData } from './index';

const OBJECT_FITS: ImageObjectFit[] = ['cover', 'contain', 'fill'];

export function ImageInspector({
  item,
  resolvedData,
  section,
  activeBreakpoint,
  onChange,
}: InspectorProps<ImageData>) {
  const viewportAspectRatio = useMemo(() => {
    const resolved = resolveSection(section, activeBreakpoint);
    const placement = resolveItem(item, section, activeBreakpoint);
    return gridItemViewportAspectRatio(placement.w, placement.h, {
      columns: resolved.columns,
      colGap: resolved.colGap,
      rowGap: resolved.rowGap,
    });
  }, [section, item, activeBreakpoint]);

  return (
    <fieldset className="fieldset gap-3 p-0">
      <legend className="fieldset-legend px-0">Image settings</legend>
      <p className="label px-0">
        Breakpoint: <code className="font-mono text-primary">{activeBreakpoint}</code>
      </p>

      <label className="floating-label">
        <span>Image URL (base)</span>
        <input
          className="input input-sm w-full"
          value={resolvedData.content ?? ''}
          placeholder="https://…"
          onChange={(e) => onChange({ content: e.target.value }, { scope: 'base' })}
        />
      </label>

      <label className="floating-label">
        <span>Alt label (base)</span>
        <input
          className="input input-sm w-full"
          value={resolvedData.label ?? ''}
          placeholder="Describe the image"
          onChange={(e) => onChange({ label: e.target.value || undefined }, { scope: 'base' })}
        />
      </label>

      <label className="floating-label">
        <span>Object fit</span>
        <select
          className="select select-sm w-full"
          value={resolvedData.objectFit ?? 'cover'}
          onChange={(e) => onChange({ objectFit: e.target.value as ImageObjectFit })}
        >
          {OBJECT_FITS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {(resolvedData.objectFit ?? 'cover') === 'cover' && resolvedData.content ? (
        <ImageFocalPointControl
          data={resolvedData}
          onChange={onChange}
          viewportAspectRatio={viewportAspectRatio}
          itemId={item.id}
        />
      ) : null}
    </fieldset>
  );
}

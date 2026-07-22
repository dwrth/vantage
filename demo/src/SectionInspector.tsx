import { useCallback, useMemo } from 'react';
import {
  DEFAULT_SECTION_PADDING_Y,
  clearSectionOverride,
  resolveSection,
  setSectionOverride,
  type Breakpoint,
  type Layout,
  type Section,
  type SectionBackground,
  type SectionBackgroundImageRepeat,
  type SectionBackgroundImageSize,
} from 'vantage';
import { SectionBackgroundFocalPointControl } from './SectionBackgroundFocalPointControl';

type SectionInspectorProps = {
  layout: Layout;
  onChange: (layout: Layout) => void;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  activeBreakpoint: Breakpoint;
};

const IMAGE_SIZES: SectionBackgroundImageSize[] = ['cover', 'contain', 'auto'];
const IMAGE_REPEATS: SectionBackgroundImageRepeat[] = [
  'no-repeat',
  'repeat',
  'repeat-x',
  'repeat-y',
];

function setSectionBackground(
  layout: Layout,
  sectionId: string,
  next: SectionBackground | undefined,
): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) => {
      if (section.id !== sectionId) return section;
      if (next === undefined) {
        const copy: Section = { ...section };
        delete copy.background;
        return copy;
      }
      return { ...section, background: next };
    }),
  };
}

function patchSection(
  layout: Layout,
  sectionId: string,
  patch: Partial<Omit<Section, 'id' | 'items'>>,
): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) =>
      section.id === sectionId ? { ...section, ...patch } : section,
    ),
  };
}

function hasAnyBackgroundKey(bg: SectionBackground): boolean {
  return (
    bg.color !== undefined ||
    bg.image !== undefined ||
    bg.imageSize !== undefined ||
    bg.imagePosition !== undefined ||
    bg.imageRepeat !== undefined ||
    bg.objectPositionX !== undefined ||
    bg.objectPositionY !== undefined ||
    bg.cropScale !== undefined ||
    bg.blur !== undefined ||
    bg.opacity !== undefined ||
    bg.parallax !== undefined
  );
}

function withPatch(
  current: SectionBackground | undefined,
  patch: Partial<SectionBackground>,
): SectionBackground | undefined {
  const merged: SectionBackground = { ...current };
  for (const key of Object.keys(patch) as (keyof SectionBackground)[]) {
    const value = patch[key];
    if (value === undefined || value === '') {
      delete merged[key];
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return hasAnyBackgroundKey(merged) ? merged : undefined;
}

function normalizeColor(input: string | undefined): string {
  if (!input) return '#ffffff';
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return '#ffffff';
}

export function SectionInspector({
  layout,
  onChange,
  selectedSectionId,
  onSelectSection,
  activeBreakpoint,
}: SectionInspectorProps) {
  const section = useMemo(
    () => layout.sections.find((sec) => sec.id === selectedSectionId) ?? null,
    [layout.sections, selectedSectionId],
  );

  const resolved = useMemo(
    () => (section ? resolveSection(section, activeBreakpoint) : null),
    [section, activeBreakpoint],
  );

  const bg = section?.background ?? {};

  const patch = useCallback(
    (next: Partial<SectionBackground>) => {
      if (!section) return;
      onChange(setSectionBackground(layout, section.id, withPatch(section.background, next)));
    },
    [layout, onChange, section],
  );

  if (layout.sections.length === 0) {
    return <p className="p-3 text-sm text-base-content/50">Add a section first.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-base-300/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Section
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend px-0">Target</legend>
          <select
            className="select select-sm w-full"
            value={section?.id ?? ''}
            onChange={(e) => onSelectSection(e.target.value || null)}
          >
            <option value="">— Select section —</option>
            {layout.sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label ?? sec.id}
              </option>
            ))}
          </select>
        </fieldset>

        {section ? (
          <>
            {activeBreakpoint !== 'desktop' && resolved ? (
              <>
                <div role="alert" className="alert alert-info alert-soft text-xs">
                  Editing {activeBreakpoint} overrides
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['Cols', 'columns', 1, resolved.columns],
                      ['Col gap', 'colGap', 0, resolved.colGap],
                      ['Row gap', 'rowGap', 0, resolved.rowGap],
                      ['Pad top', 'paddingTop', 0, resolved.paddingTop],
                      ['Pad bot', 'paddingBottom', 0, resolved.paddingBottom],
                    ] as const
                  ).map(([label, key, min, value]) => (
                    <label key={key} className="floating-label">
                      <span>{label}</span>
                      <input
                        type="number"
                        className="input input-sm w-full"
                        min={min}
                        value={value}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          if (!Number.isFinite(num)) return;
                          onChange(
                            setSectionOverride(layout, section.id, activeBreakpoint, {
                              [key]: Math.max(min, Math.round(num)),
                            }),
                          );
                        }}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-full"
                  onClick={() =>
                    onChange(clearSectionOverride(layout, section.id, activeBreakpoint))
                  }
                >
                  Reset {activeBreakpoint} layout
                </button>
                <div className="divider my-0" />
              </>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="floating-label">
                <span>Padding top</span>
                <input
                  type="number"
                  className="input input-sm w-full"
                  min={0}
                  max={240}
                  value={section.paddingTop ?? DEFAULT_SECTION_PADDING_Y}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!Number.isFinite(num)) return;
                    onChange(
                      patchSection(layout, section.id, {
                        paddingTop: Math.max(0, Math.round(num)),
                      }),
                    );
                  }}
                />
              </label>
              <label className="floating-label">
                <span>Padding bottom</span>
                <input
                  type="number"
                  className="input input-sm w-full"
                  min={0}
                  max={240}
                  value={section.paddingBottom ?? DEFAULT_SECTION_PADDING_Y}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!Number.isFinite(num)) return;
                    onChange(
                      patchSection(layout, section.id, {
                        paddingBottom: Math.max(0, Math.round(num)),
                      }),
                    );
                  }}
                />
              </label>
            </div>

            <div className="divider my-0">Background</div>

            <label className="floating-label">
              <span>Color</span>
              <div className="join w-full">
                <input
                  type="color"
                  className="join-item h-8 w-10 cursor-pointer border border-base-300 bg-base-100 p-1"
                  value={normalizeColor(bg.color)}
                  onChange={(e) => patch({ color: e.target.value })}
                />
                <input
                  type="text"
                  className="input input-sm join-item min-w-0 flex-1"
                  placeholder="transparent"
                  value={bg.color ?? ''}
                  onChange={(e) => patch({ color: e.target.value || undefined })}
                />
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  onClick={() => patch({ color: undefined })}
                >
                  ×
                </button>
              </div>
            </label>

            <label className="floating-label">
              <span>Image URL</span>
              <div className="join w-full">
                <input
                  type="text"
                  className="input input-sm join-item min-w-0 flex-1"
                  placeholder="https://…"
                  value={bg.image ?? ''}
                  onChange={(e) => patch({ image: e.target.value || undefined })}
                />
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  onClick={() => patch({ image: undefined })}
                >
                  ×
                </button>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="floating-label">
                <span>Size</span>
                <select
                  className="select select-sm w-full"
                  value={bg.imageSize ?? 'cover'}
                  onChange={(e) =>
                    patch({ imageSize: e.target.value as SectionBackgroundImageSize })
                  }
                >
                  {IMAGE_SIZES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="floating-label">
                <span>Repeat</span>
                <select
                  className="select select-sm w-full"
                  value={bg.imageRepeat ?? 'no-repeat'}
                  onChange={(e) =>
                    patch({ imageRepeat: e.target.value as SectionBackgroundImageRepeat })
                  }
                >
                  {IMAGE_REPEATS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(bg.imageSize ?? 'cover') === 'cover' && bg.image ? (
              <SectionBackgroundFocalPointControl
                background={bg}
                imageSrc={bg.image}
                sectionId={section.id}
                onChange={patch}
              />
            ) : (
              <label className="floating-label">
                <span>Position</span>
                <input
                  type="text"
                  className="input input-sm w-full"
                  placeholder="center"
                  value={bg.imagePosition ?? ''}
                  onChange={(e) => patch({ imagePosition: e.target.value || undefined })}
                />
              </label>
            )}

            <fieldset className="fieldset p-0">
              <legend className="fieldset-legend px-0">
                Blur <span className="font-mono text-primary">{bg.blur ?? 0}px</span>
              </legend>
              <input
                type="range"
                className="range range-xs range-primary"
                min={0}
                max={80}
                step={1}
                value={bg.blur ?? 0}
                onChange={(e) => patch({ blur: Number(e.target.value) })}
              />
            </fieldset>

            <fieldset className="fieldset p-0">
              <legend className="fieldset-legend px-0">
                Opacity{' '}
                <span className="font-mono text-primary">
                  {((bg.opacity ?? 1) * 100).toFixed(0)}%
                </span>
              </legend>
              <input
                type="range"
                className="range range-xs range-primary"
                min={0}
                max={1}
                step={0.01}
                value={bg.opacity ?? 1}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
              />
            </fieldset>

            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={Boolean(bg.parallax)}
                disabled={!bg.image}
                onChange={(e) => patch({ parallax: e.target.checked || undefined })}
              />
              <span className="text-sm">Parallax</span>
            </label>

            <button
              type="button"
              className="btn btn-ghost btn-sm w-full"
              onClick={() => onChange(setSectionBackground(layout, section.id, undefined))}
            >
              Clear background
            </button>
          </>
        ) : (
          <p className="text-sm text-base-content/50">Select a section to edit.</p>
        )}
      </div>
    </div>
  );
}

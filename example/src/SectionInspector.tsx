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
import s from './sectionInspector.module.css';

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
    bg.blur !== undefined ||
    bg.opacity !== undefined
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

  const clearKey = useCallback(
    (key: keyof SectionBackground) => patch({ [key]: undefined } as Partial<SectionBackground>),
    [patch],
  );

  const clearAll = useCallback(() => {
    if (!section) return;
    onChange(setSectionBackground(layout, section.id, undefined));
  }, [layout, onChange, section]);

  const setSectionNumber = useCallback(
    (key: 'paddingTop' | 'paddingBottom', value: string) => {
      if (!section) return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      onChange(patchSection(layout, section.id, { [key]: Math.max(0, Math.round(num)) }));
    },
    [layout, onChange, section],
  );

  const setOverrideNumber = useCallback(
    (
      key: 'columns' | 'colGap' | 'rowGap' | 'paddingTop' | 'paddingBottom',
      min: number,
      value: string,
    ) => {
      if (!section || activeBreakpoint === 'desktop') return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      onChange(
        setSectionOverride(layout, section.id, activeBreakpoint, {
          [key]: Math.max(min, Math.round(num)),
        }),
      );
    },
    [layout, onChange, section, activeBreakpoint],
  );

  const resetBreakpointLayout = useCallback(() => {
    if (!section || activeBreakpoint === 'desktop') return;
    onChange(clearSectionOverride(layout, section.id, activeBreakpoint));
  }, [layout, onChange, section, activeBreakpoint]);

  if (layout.sections.length === 0) {
    return (
      <aside className={s.panel}>
        <div className={s.panelHeader}>Section</div>
        <p className={s.panelEmpty}>Add a section first.</p>
      </aside>
    );
  }

  return (
    <aside className={s.panel}>
      <div className={s.panelHeader}>Section</div>
      <div className={s.panelBody}>
        <label className={s.field}>
          <span className={s.fieldLabel}>Section</span>
          <select
            className={s.select}
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
        </label>

        {section ? (
          <>
            {activeBreakpoint !== 'desktop' && resolved ? (
              <>
                <p className={s.panelHint}>
                  Editing {activeBreakpoint} overrides. Empty fields inherit desktop values.
                </p>
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Cols</span>
                    <input
                      type="number"
                      className={s.input}
                      min={1}
                      max={24}
                      value={resolved.columns}
                      onChange={(e) => setOverrideNumber('columns', 1, e.target.value)}
                    />
                  </label>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Col gap</span>
                    <input
                      type="number"
                      className={s.input}
                      min={0}
                      max={64}
                      value={resolved.colGap}
                      onChange={(e) => setOverrideNumber('colGap', 0, e.target.value)}
                    />
                  </label>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Row gap</span>
                    <input
                      type="number"
                      className={s.input}
                      min={0}
                      max={64}
                      value={resolved.rowGap}
                      onChange={(e) => setOverrideNumber('rowGap', 0, e.target.value)}
                    />
                  </label>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Pad top</span>
                    <input
                      type="number"
                      className={s.input}
                      min={0}
                      max={240}
                      value={resolved.paddingTop}
                      onChange={(e) => setOverrideNumber('paddingTop', 0, e.target.value)}
                    />
                  </label>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Pad bottom</span>
                    <input
                      type="number"
                      className={s.input}
                      min={0}
                      max={240}
                      value={resolved.paddingBottom}
                      onChange={(e) => setOverrideNumber('paddingBottom', 0, e.target.value)}
                    />
                  </label>
                </div>
                <button type="button" className={s.clearButton} onClick={resetBreakpointLayout}>
                  Reset {activeBreakpoint} layout
                </button>
              </>
            ) : null}

            <div className={s.grid2}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Padding top</span>
                <input
                  type="number"
                  className={s.input}
                  min={0}
                  max={240}
                  value={section.paddingTop ?? DEFAULT_SECTION_PADDING_Y}
                  onChange={(e) => setSectionNumber('paddingTop', e.target.value)}
                />
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>Padding bottom</span>
                <input
                  type="number"
                  className={s.input}
                  min={0}
                  max={240}
                  value={section.paddingBottom ?? DEFAULT_SECTION_PADDING_Y}
                  onChange={(e) => setSectionNumber('paddingBottom', e.target.value)}
                />
              </label>
            </div>

            <div className={s.row}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Color</span>
                <div className={s.colorRow}>
                  <input
                    type="color"
                    className={s.colorSwatch}
                    value={normalizeColor(bg.color)}
                    onChange={(e) => patch({ color: e.target.value })}
                  />
                  <input
                    type="text"
                    className={s.input}
                    placeholder="transparent"
                    value={bg.color ?? ''}
                    onChange={(e) => patch({ color: e.target.value || undefined })}
                  />
                  <button
                    type="button"
                    className={s.iconButton}
                    title="Clear color"
                    aria-label="Clear color"
                    onClick={() => clearKey('color')}
                  >
                    ×
                  </button>
                </div>
              </label>
            </div>

            <div className={s.row}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Image URL</span>
                <div className={s.inputButtonRow}>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="https://…"
                    value={bg.image ?? ''}
                    onChange={(e) => patch({ image: e.target.value || undefined })}
                  />
                  <button
                    type="button"
                    className={s.iconButton}
                    title="Clear image"
                    aria-label="Clear image"
                    onClick={() => clearKey('image')}
                  >
                    ×
                  </button>
                </div>
              </label>
            </div>

            <div className={s.grid2}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Size</span>
                <select
                  className={s.select}
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
              <label className={s.field}>
                <span className={s.fieldLabel}>Repeat</span>
                <select
                  className={s.select}
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

            <label className={s.field}>
              <span className={s.fieldLabel}>Position</span>
              <input
                type="text"
                className={s.input}
                placeholder="center"
                value={bg.imagePosition ?? ''}
                onChange={(e) => patch({ imagePosition: e.target.value || undefined })}
              />
            </label>

            <label className={s.field}>
              <span className={s.fieldLabelRow}>
                <span>Blur</span>
                <span className={s.fieldValue}>{bg.blur ?? 0}px</span>
              </span>
              <input
                type="range"
                className={s.range}
                min={0}
                max={80}
                step={1}
                value={bg.blur ?? 0}
                onChange={(e) => patch({ blur: Number(e.target.value) })}
              />
            </label>

            <label className={s.field}>
              <span className={s.fieldLabelRow}>
                <span>Opacity</span>
                <span className={s.fieldValue}>{((bg.opacity ?? 1) * 100).toFixed(0)}%</span>
              </span>
              <input
                type="range"
                className={s.range}
                min={0}
                max={1}
                step={0.01}
                value={bg.opacity ?? 1}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
              />
            </label>

            <button type="button" className={s.clearButton} onClick={clearAll}>
              Clear background
            </button>
          </>
        ) : (
          <p className={s.panelEmpty}>Select a section above to edit its background.</p>
        )}
      </div>
    </aside>
  );
}

function normalizeColor(input: string | undefined): string {
  if (!input) return '#ffffff';
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#ffffff';
}

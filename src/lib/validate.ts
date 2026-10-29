import { BREAKPOINTS, NON_DESKTOP_BREAKPOINTS, type Breakpoint, type Layout } from '../types';

export type LayoutValidationResult = {
  valid: boolean;
  /** One message per problem, prefixed with its path, e.g. `sections[0].items[1].w: …`. */
  errors: string[];
};

type Report = (path: string, message: string) => void;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkMeta(raw: unknown, path: string, report: Report): void {
  if (raw !== undefined && !isPlainObject(raw)) report(path, 'must be an object');
}

/** Required number field: finite and inside `[min, max]`. */
function checkNumber(raw: unknown, path: string, report: Report, min?: number, max?: number): void {
  if (!Number.isFinite(raw)) {
    report(path, 'must be a finite number');
    return;
  }
  const value = raw as number;
  if (min !== undefined && value < min) report(path, `must be >= ${min}`);
  if (max !== undefined && value > max) report(path, `must be <= ${max}`);
}

function checkOptionalNumber(
  raw: unknown,
  path: string,
  report: Report,
  min?: number,
  max?: number,
): void {
  if (raw !== undefined) checkNumber(raw, path, report, min, max);
}

function checkOptionalString(raw: unknown, path: string, report: Report): void {
  if (raw !== undefined && typeof raw !== 'string') report(path, 'must be a string');
}

function checkOptionalObject(raw: unknown, path: string, report: Report): void {
  if (raw !== undefined && !isPlainObject(raw)) report(path, 'must be an object');
}

function checkOptionalBoolean(raw: unknown, path: string, report: Report): void {
  if (raw !== undefined && typeof raw !== 'boolean') report(path, 'must be a boolean');
}

function checkItem(raw: unknown, path: string, report: Report): void {
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  if (typeof raw.id !== 'string') report(`${path}.id`, 'must be a string');
  if (typeof raw.kind !== 'string' || raw.kind.length === 0) {
    report(`${path}.kind`, 'must be a non-empty string');
  }
  for (const key of ['x', 'y', 'w', 'h'] as const) checkNumber(raw[key], `${path}.${key}`, report);
  checkOptionalString(raw.label, `${path}.label`, report);
  checkOptionalString(raw.ref, `${path}.ref`, report);
  checkOptionalObject(raw.data, `${path}.data`, report);
  checkMeta(raw.meta, `${path}.meta`, report);
}

const IMAGE_SIZES = ['cover', 'contain', 'auto'];
const IMAGE_REPEATS = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'];

function checkItemOverride(raw: unknown, path: string, report: Report): void {
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  checkOptionalNumber(raw.x, `${path}.x`, report);
  checkOptionalNumber(raw.y, `${path}.y`, report);
  checkOptionalNumber(raw.w, `${path}.w`, report, 1);
  checkOptionalNumber(raw.h, `${path}.h`, report, 1);
  checkOptionalBoolean(raw.hidden, `${path}.hidden`, report);
  checkOptionalObject(raw.data, `${path}.data`, report);
}

function checkRows(raw: unknown, path: string, report: Report): void {
  if (raw !== undefined && !(Number.isInteger(raw) && (raw as number) >= 1)) {
    report(path, 'must be an integer >= 1');
  }
}

function checkSectionOverride(raw: unknown, path: string, report: Report): void {
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  checkRows(raw.rows, `${path}.rows`, report);
  checkOptionalNumber(raw.columns, `${path}.columns`, report, 1);
  checkOptionalNumber(raw.colGap, `${path}.colGap`, report, 0);
  checkOptionalNumber(raw.rowGap, `${path}.rowGap`, report, 0);
  checkOptionalNumber(raw.paddingTop, `${path}.paddingTop`, report, 0);
  checkOptionalNumber(raw.paddingBottom, `${path}.paddingBottom`, report, 0);
  if (raw.items === undefined) return;
  if (!isPlainObject(raw.items)) {
    report(`${path}.items`, 'must be an object');
    return;
  }
  for (const [id, value] of Object.entries(raw.items)) {
    checkItemOverride(value, `${path}.items.${id}`, report);
  }
}

function checkOverrides(raw: unknown, path: string, report: Report): void {
  if (raw === undefined) return;
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  for (const key of Object.keys(raw)) {
    if (!NON_DESKTOP_BREAKPOINTS.includes(key as (typeof NON_DESKTOP_BREAKPOINTS)[number])) {
      report(`${path}.${key}`, `must be one of ${NON_DESKTOP_BREAKPOINTS.join(', ')}`);
      continue;
    }
    checkSectionOverride(raw[key], `${path}.${key}`, report);
  }
}

function checkBackground(raw: unknown, path: string, report: Report): void {
  if (raw === undefined) return;
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  checkOptionalString(raw.color, `${path}.color`, report);
  checkOptionalString(raw.image, `${path}.image`, report);
  if (raw.imageSize !== undefined && !IMAGE_SIZES.includes(raw.imageSize as string)) {
    report(`${path}.imageSize`, `must be one of ${IMAGE_SIZES.join(', ')}`);
  }
  checkOptionalString(raw.imagePosition, `${path}.imagePosition`, report);
  if (raw.imageRepeat !== undefined && !IMAGE_REPEATS.includes(raw.imageRepeat as string)) {
    report(`${path}.imageRepeat`, `must be one of ${IMAGE_REPEATS.join(', ')}`);
  }
  checkOptionalNumber(raw.objectPositionX, `${path}.objectPositionX`, report, 0, 100);
  checkOptionalNumber(raw.objectPositionY, `${path}.objectPositionY`, report, 0, 100);
  checkOptionalNumber(raw.cropScale, `${path}.cropScale`, report, 0.4, 1);
  checkOptionalNumber(raw.blur, `${path}.blur`, report, 0);
  checkOptionalNumber(raw.opacity, `${path}.opacity`, report, 0, 1);
  checkOptionalBoolean(raw.parallax, `${path}.parallax`, report);
}

function checkSection(raw: unknown, path: string, report: Report): void {
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  if (typeof raw.id !== 'string') report(`${path}.id`, 'must be a string');
  checkNumber(raw.columns, `${path}.columns`, report, 1);
  checkNumber(raw.colGap, `${path}.colGap`, report, 0);
  checkNumber(raw.rowGap, `${path}.rowGap`, report, 0);
  checkOptionalNumber(raw.paddingTop, `${path}.paddingTop`, report, 0);
  checkOptionalNumber(raw.paddingBottom, `${path}.paddingBottom`, report, 0);
  checkRows(raw.rows, `${path}.rows`, report);
  checkOptionalString(raw.label, `${path}.label`, report);
  checkMeta(raw.meta, `${path}.meta`, report);
  checkBackground(raw.background, `${path}.background`, report);
  if (Array.isArray(raw.items)) {
    // `entries()` visits holes in sparse arrays, so they are reported too.
    for (const [index, item] of raw.items.entries()) {
      checkItem(item, `${path}.items[${index}]`, report);
    }
  } else {
    report(`${path}.items`, 'must be an array');
  }
  checkOverrides(raw.overrides, `${path}.overrides`, report);
}

/** Returns false when the list is too broken to check the width maps against it. */
function checkBreakpoints(raw: unknown, path: string, report: Report): boolean {
  if (!Array.isArray(raw)) {
    report(path, 'must be an array');
    return false;
  }
  if (raw.length === 0) {
    report(path, 'must not be empty');
    return false;
  }
  if (!raw.every((bp) => typeof bp === 'string')) {
    report(path, 'must contain only strings');
    return false;
  }
  let ok = true;
  const unique = new Set(raw);
  if (unique.size !== raw.length) {
    report(path, 'must not contain duplicates');
    ok = false;
  }
  if (!unique.has('desktop')) {
    report(path, 'must include "desktop"');
    ok = false;
  }
  for (const bp of unique) {
    if (!BREAKPOINTS.includes(bp as Breakpoint)) {
      report(path, `unknown breakpoint "${bp}"`);
      ok = false;
    }
  }
  return ok;
}

function checkBreakpointWidths(
  raw: unknown,
  path: string,
  breakpoints: Breakpoint[],
  enforceOrder: boolean,
  report: Report,
): void {
  if (!isPlainObject(raw)) {
    report(path, 'must be an object');
    return;
  }
  const enabledNonDesktop: string[] = NON_DESKTOP_BREAKPOINTS.filter((bp) =>
    breakpoints.includes(bp),
  );
  for (const bp of enabledNonDesktop) {
    if (!(bp in raw)) report(`${path}.${bp}`, 'is required for an enabled breakpoint');
  }
  for (const [key, value] of Object.entries(raw)) {
    if (!enabledNonDesktop.includes(key)) {
      report(`${path}.${key}`, 'is not an enabled non-desktop breakpoint');
    } else if (!Number.isInteger(value) || (value as number) < 1) {
      report(`${path}.${key}`, 'must be an integer >= 1');
    }
  }
  const { mobile, tablet } = raw;
  if (
    enforceOrder &&
    Number.isFinite(mobile) &&
    Number.isFinite(tablet) &&
    (mobile as number) >= (tablet as number)
  ) {
    report(path, 'mobile must be smaller than tablet');
  }
}

function checkUniqueIds(sections: unknown[], report: Report): void {
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const [s, section] of sections.entries()) {
    if (!isPlainObject(section)) continue;
    if (typeof section.id === 'string') {
      if (sectionIds.has(section.id)) {
        report(`sections[${s}].id`, `duplicate section id "${section.id}"`);
      }
      sectionIds.add(section.id);
    }
    if (!Array.isArray(section.items)) continue;
    for (const [i, item] of section.items.entries()) {
      if (!isPlainObject(item) || typeof item.id !== 'string') continue;
      if (itemIds.has(item.id)) {
        report(`sections[${s}].items[${i}].id`, `duplicate item id "${item.id}"`);
      }
      itemIds.add(item.id);
    }
  }
}

/**
 * Check raw data against the `Layout` shape and list every problem found, e.g. to log why
 * stored data was rejected. `isValidLayout` is the same check as a type guard.
 */
export function validateLayout(data: unknown): LayoutValidationResult {
  const errors: string[] = [];
  const report: Report = (path, message) => errors.push(path ? `${path}: ${message}` : message);

  if (!isPlainObject(data)) {
    report('', 'layout must be an object');
    return { valid: false, errors };
  }
  checkMeta(data.meta, 'meta', report);
  if (checkBreakpoints(data.breakpoints, 'breakpoints', report)) {
    const breakpoints = data.breakpoints as Breakpoint[];
    checkBreakpointWidths(data.breakpointWidths, 'breakpointWidths', breakpoints, true, report);
    checkBreakpointWidths(
      data.breakpointPreviewWidths,
      'breakpointPreviewWidths',
      breakpoints,
      false,
      report,
    );
  }
  if (Array.isArray(data.sections)) {
    checkUniqueIds(data.sections, report);
    for (const [index, section] of data.sections.entries()) {
      checkSection(section, `sections[${index}]`, report);
    }
  } else {
    report('sections', 'must be an array');
  }
  return { valid: errors.length === 0, errors };
}

export function isValidLayout(data: unknown): data is Layout {
  return validateLayout(data).valid;
}

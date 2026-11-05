import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnknownKind } from '../components/UnknownKind';
import type { ComponentRegistry, GridItem, KindDescriptor } from '../types';
import { defineKind, resolveDescriptorForKind, resolveRegistry, resolveRenderer } from './registry';

const item = (kind: string): GridItem => ({ id: 'i', x: 0, y: 0, w: 1, h: 1, kind });

const Preview = () => null;
const Edit = () => null;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('defineKind', () => {
  it('returns the descriptor unchanged', () => {
    const descriptor: KindDescriptor = { component: Preview, defaults: { w: 1, h: 1 } };
    expect(defineKind(descriptor)).toBe(descriptor);
  });
});

describe('resolveRegistry', () => {
  it('returns a shallow copy', () => {
    const registry: ComponentRegistry = { a: { component: Preview, defaults: { w: 1, h: 1 } } };
    const resolved = resolveRegistry(registry);
    expect(resolved).not.toBe(registry);
    expect(resolved).toEqual(registry);
    expect(resolved.a).toBe(registry.a);
  });
});

describe('resolveRenderer', () => {
  const registry = resolveRegistry({
    plain: { component: Preview, defaults: { w: 1, h: 1 } },
    editable: { component: Preview, editComponent: Edit, defaults: { w: 1, h: 1 } },
  });

  it('uses component for preview', () => {
    expect(resolveRenderer(registry, item('plain'), 'preview')).toBe(Preview);
    expect(resolveRenderer(registry, item('editable'), 'preview')).toBe(Preview);
  });

  it('prefers editComponent for edit and falls back to component', () => {
    expect(resolveRenderer(registry, item('editable'), 'edit')).toBe(Edit);
    expect(resolveRenderer(registry, item('plain'), 'edit')).toBe(Preview);
  });

  it('returns UnknownKind for unregistered kinds on both surfaces', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveRenderer(registry, item('missing-a'), 'preview')).toBe(UnknownKind);
    expect(resolveRenderer(registry, item('missing-a'), 'edit')).toBe(UnknownKind);
  });

  it('warns once per unknown kind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveRenderer(registry, item('missing-b'), 'preview');
    resolveRenderer(registry, item('missing-b'), 'edit');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[vantage] No component registered for kind "missing-b".');
    resolveRenderer(registry, item('missing-c'), 'preview');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('does not warn for registered kinds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveRenderer(registry, item('plain'), 'preview');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('resolveDescriptorForKind', () => {
  const registry = resolveRegistry({ a: { component: Preview, defaults: { w: 1, h: 1 } } });

  it('returns the descriptor or undefined without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveDescriptorForKind(registry, 'a')).toBe(registry.a);
    expect(resolveDescriptorForKind(registry, 'nope')).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});

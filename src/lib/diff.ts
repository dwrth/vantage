import type { GridItem, Layout, Section } from '../types';

export type ItemAddedEvent = {
  sectionId: string;
  item: GridItem;
};

export type ItemRemovedEvent = {
  sectionId: string;
  itemId: string;
  prev: GridItem;
};

export type ItemUpdatedEvent = {
  sectionId: string;
  item: GridItem;
  prev: GridItem;
};

export type ItemMovedEvent = {
  fromSectionId: string;
  toSectionId: string;
  item: GridItem;
  prev: GridItem;
};

export type ItemsReorderedEvent = {
  sectionId: string;
  itemIds: string[];
  prevItemIds: string[];
};

export type SectionAddedEvent = {
  section: Section;
};

export type SectionRemovedEvent = {
  sectionId: string;
  prev: Section;
};

export type SectionUpdatedEvent = {
  section: Section;
  prev: Section;
};

export type LayoutUpdatedEvent = {
  layout: Layout;
  prev: Layout;
};

export type LayoutChangeset = {
  itemsAdded: ItemAddedEvent[];
  itemsRemoved: ItemRemovedEvent[];
  itemsUpdated: ItemUpdatedEvent[];
  itemsMoved: ItemMovedEvent[];
  itemsReordered: ItemsReorderedEvent[];
  sectionsAdded: SectionAddedEvent[];
  sectionsRemoved: SectionRemovedEvent[];
  sectionsUpdated: SectionUpdatedEvent[];
  layoutUpdated: LayoutUpdatedEvent | null;
};

type ItemLocation = {
  sectionId: string;
  item: GridItem;
};

function toSectionMap(sections: Section[]): Map<string, Section> {
  return new Map(sections.map((section) => [section.id, section]));
}

function toItemMap(sections: Section[]): Map<string, ItemLocation> {
  const map = new Map<string, ItemLocation>();
  for (const section of sections) {
    for (const item of section.items) {
      map.set(item.id, { sectionId: section.id, item });
    }
  }
  return map;
}

function sameIdMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const id of a) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of b) {
    const next = (counts.get(id) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(id, next);
  }
  return true;
}

function sectionChromeChanged(prev: Section, next: Section): boolean {
  return (
    prev.label !== next.label ||
    prev.columns !== next.columns ||
    prev.colGap !== next.colGap ||
    prev.rowGap !== next.rowGap ||
    prev.paddingTop !== next.paddingTop ||
    prev.paddingBottom !== next.paddingBottom ||
    prev.background !== next.background ||
    prev.overrides !== next.overrides ||
    prev.meta !== next.meta
  );
}

function layoutTopLevelChanged(prev: Layout, next: Layout): boolean {
  return (
    prev.breakpoints !== next.breakpoints ||
    prev.breakpointWidths !== next.breakpointWidths ||
    prev.breakpointPreviewWidths !== next.breakpointPreviewWidths ||
    prev.meta !== next.meta
  );
}

export function diffLayouts(prev: Layout, next: Layout): LayoutChangeset {
  const sectionsAdded: SectionAddedEvent[] = [];
  const sectionsRemoved: SectionRemovedEvent[] = [];
  const sectionsUpdated: SectionUpdatedEvent[] = [];
  const itemsAdded: ItemAddedEvent[] = [];
  const itemsRemoved: ItemRemovedEvent[] = [];
  const itemsUpdated: ItemUpdatedEvent[] = [];
  const itemsMoved: ItemMovedEvent[] = [];
  const itemsReordered: ItemsReorderedEvent[] = [];

  const prevSections = toSectionMap(prev.sections);
  const nextSections = toSectionMap(next.sections);
  const prevItems = toItemMap(prev.sections);
  const nextItems = toItemMap(next.sections);

  for (const [sectionId, section] of nextSections) {
    if (!prevSections.has(sectionId)) {
      sectionsAdded.push({ section });
    }
  }

  for (const [sectionId, section] of prevSections) {
    if (!nextSections.has(sectionId)) {
      sectionsRemoved.push({ sectionId, prev: section });
    }
  }

  for (const [sectionId, nextSection] of nextSections) {
    const prevSection = prevSections.get(sectionId);
    if (!prevSection) continue;
    if (prevSection === nextSection) continue;
    if (sectionChromeChanged(prevSection, nextSection)) {
      sectionsUpdated.push({ section: nextSection, prev: prevSection });
    }

    const prevItemIds = prevSection.items.map((item) => item.id);
    const nextItemIds = nextSection.items.map((item) => item.id);
    if (
      prevItemIds.length > 0 &&
      sameIdMultiset(prevItemIds, nextItemIds) &&
      prevItemIds.some((id, index) => id !== nextItemIds[index])
    ) {
      itemsReordered.push({ sectionId, itemIds: nextItemIds, prevItemIds });
    }
  }

  for (const [itemId, nextLocation] of nextItems) {
    const prevLocation = prevItems.get(itemId);
    if (!prevLocation) {
      itemsAdded.push({ sectionId: nextLocation.sectionId, item: nextLocation.item });
      continue;
    }

    if (prevLocation.sectionId !== nextLocation.sectionId) {
      itemsMoved.push({
        fromSectionId: prevLocation.sectionId,
        toSectionId: nextLocation.sectionId,
        item: nextLocation.item,
        prev: prevLocation.item,
      });
      continue;
    }

    if (prevLocation.item !== nextLocation.item) {
      itemsUpdated.push({
        sectionId: nextLocation.sectionId,
        item: nextLocation.item,
        prev: prevLocation.item,
      });
    }
  }

  for (const [itemId, prevLocation] of prevItems) {
    if (!nextItems.has(itemId)) {
      itemsRemoved.push({
        sectionId: prevLocation.sectionId,
        itemId,
        prev: prevLocation.item,
      });
    }
  }

  return {
    itemsAdded,
    itemsRemoved,
    itemsUpdated,
    itemsMoved,
    itemsReordered,
    sectionsAdded,
    sectionsRemoved,
    sectionsUpdated,
    layoutUpdated: layoutTopLevelChanged(prev, next) ? { layout: next, prev } : null,
  };
}

export function emitLayoutChange(
  prev: Layout,
  next: Layout,
  onChange: (next: Layout, changeset: LayoutChangeset) => void,
): void {
  onChange(next, diffLayouts(prev, next));
}

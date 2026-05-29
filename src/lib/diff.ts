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

export type SectionAddedEvent = {
  section: Section;
};

export type SectionRemovedEvent = {
  sectionId: string;
  prev: Section;
};

export type LayoutChangeset = {
  itemsAdded: ItemAddedEvent[];
  itemsRemoved: ItemRemovedEvent[];
  itemsUpdated: ItemUpdatedEvent[];
  itemsMoved: ItemMovedEvent[];
  sectionsAdded: SectionAddedEvent[];
  sectionsRemoved: SectionRemovedEvent[];
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

export function diffLayouts(prev: Layout, next: Layout): LayoutChangeset {
  const sectionsAdded: SectionAddedEvent[] = [];
  const sectionsRemoved: SectionRemovedEvent[] = [];
  const itemsAdded: ItemAddedEvent[] = [];
  const itemsRemoved: ItemRemovedEvent[] = [];
  const itemsUpdated: ItemUpdatedEvent[] = [];
  const itemsMoved: ItemMovedEvent[] = [];

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
    sectionsAdded,
    sectionsRemoved,
  };
}

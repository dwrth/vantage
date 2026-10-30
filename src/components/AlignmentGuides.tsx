import { Fragment } from 'react';
import { guideBox, type AlignmentResult, type GuideGeometry, type GuideRect } from '../lib/guides';
import builder from '../styles/builder.module.css';

type AlignmentGuidesProps = {
  result: AlignmentResult;
  moving: GuideRect;
  /** Other blocks of the section, by id (for size-match markers). */
  others: Map<string, GuideRect>;
  columns: number;
  geometry: GuideGeometry;
};

function cellPlacement(rect: GuideRect, columns: number): React.CSSProperties {
  const x = rect.fullBleed ? 0 : rect.x;
  const w = rect.fullBleed ? columns : rect.w;
  return { gridColumn: `${x + 2} / span ${w}`, gridRow: `${rect.y + 1} / span ${rect.h}` };
}

/**
 * Alignment lines and size-match markers for the block being dragged or resized. Drawn inside
 * the section grid, above the blocks; purely visual (`aria-hidden`, no pointer events).
 */
export function AlignmentGuides({
  result,
  moving,
  others,
  columns,
  geometry,
}: AlignmentGuidesProps) {
  const markers: { key: string; rect: GuideRect; dimension: 'w' | 'h' }[] = [];
  for (const match of result.sizeMatches) {
    markers.push({
      key: `${match.dimension}:${moving.id}`,
      rect: moving,
      dimension: match.dimension,
    });
    for (const id of match.itemIds) {
      const rect = others.get(id);
      if (rect) markers.push({ key: `${match.dimension}:${id}`, rect, dimension: match.dimension });
    }
  }

  return (
    <Fragment>
      {result.guides.map((guide) => {
        const box = guideBox(guide, geometry);
        return (
          <div
            key={`${guide.orientation}:${guide.edge}:${guide.position}`}
            className={[
              builder['alignment-guide'],
              builder[`alignment-guide--${guide.orientation}`],
              guide.sectionCenter ? builder['alignment-guide--section'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            aria-hidden="true"
            data-vantage-guide={guide.orientation}
          />
        );
      })}
      {markers.map(({ key, rect, dimension }) => (
        <div
          key={key}
          className={[builder['size-marker'], builder[`size-marker--${dimension}`]].join(' ')}
          style={cellPlacement(rect, columns)}
          aria-hidden="true"
          data-vantage-size-match={dimension}
        />
      ))}
    </Fragment>
  );
}

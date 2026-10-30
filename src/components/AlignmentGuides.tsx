import { Fragment } from 'react';
import { guideBox, type AlignmentResult, type GuideGeometry } from '../lib/guides';
import builder from '../styles/builder.module.css';

type AlignmentGuidesProps = {
  result: AlignmentResult;
  geometry: GuideGeometry;
};

/**
 * Alignment lines for the block being dragged or resized. Drawn inside
 * the section grid, above the blocks; purely visual (`aria-hidden`, no pointer events).
 */
export function AlignmentGuides({ result, geometry }: AlignmentGuidesProps) {
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
    </Fragment>
  );
}

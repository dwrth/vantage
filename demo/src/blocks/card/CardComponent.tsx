import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import type { CardData } from './index';

function CardBody({ item }: { item: PreviewRendererProps<CardData>['item'] }) {
  const data = item.data ?? {};

  return (
    <div className="card card-sm h-full w-full bg-base-100 shadow-none">
      {data.image ? (
        <figure className="m-0 overflow-hidden rounded-t-box">
          <img
            src={data.image}
            alt={data.imageAlt ?? data.title ?? ''}
            className="aspect-video w-full object-cover"
            draggable={false}
          />
        </figure>
      ) : null}
      <div className="card-body gap-2 p-3">
        {data.title ? <h3 className="card-title text-base">{data.title}</h3> : null}
        {data.content ? <p className="text-sm text-base-content/70">{data.content}</p> : null}
        {data.cta ? (
          <div className="card-actions mt-auto">
            <button type="button" className="btn btn-sm btn-primary">
              {data.cta}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CardPreview({ item }: PreviewRendererProps<CardData>) {
  return <CardBody item={item} />;
}

export function CardEdit({ item }: EditRendererProps<CardData>) {
  return <CardBody item={item} />;
}

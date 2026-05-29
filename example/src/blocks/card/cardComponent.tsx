import type { ItemRendererProps } from 'vantage';
import type { CardData } from './index';
import s from './card.module.css';
import ui from '../ui.module.css';

function CardMedia({ data }: { data: CardData }) {
  if (!data.image) return null;

  return (
    <figure className={s.media}>
      <img className={s.image} src={data.image} alt={data.imageAlt ?? data.title ?? ''} />
    </figure>
  );
}

function CardEdit({ item, interactive }: ItemRendererProps<CardData>) {
  const data = item.data ?? {};
  return (
    <div className={s.content}>
      <CardMedia data={data} />
      <div className={s.body}>
        {data.title && <h3 className={ui.cardTitle}>{data.title}</h3>}
        {data.content && <p className={ui.cardBody}>{data.content}</p>}
      </div>
      {data.cta && (
        <button
          type="button"
          className={`${ui.button} ${ui.buttonPrimary} ${ui.cardCta}`}
          onClick={interactive ? (e) => e.stopPropagation() : undefined}
          onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
        >
          {data.cta}
        </button>
      )}
    </div>
  );
}

function CardPreview({ item }: ItemRendererProps<CardData>) {
  const data = item.data ?? {};
  return (
    <>
      <CardMedia data={data} />
      <div className={s.body}>
        {data.title && <h3 className={ui.cardTitle}>{data.title}</h3>}
        {data.content && <p className={ui.cardBody}>{data.content}</p>}
      </div>
      {data.cta && (
        <button type="button" className={`${ui.button} ${ui.buttonPrimary} ${ui.cardCta}`}>
          {data.cta}
        </button>
      )}
    </>
  );
}

export function CardComponent(props: ItemRendererProps<CardData>) {
  return props.mode === 'preview' ? (
    <CardPreview {...props} />
  ) : (
    <CardEdit {...props} interactive={props.interactive} />
  );
}

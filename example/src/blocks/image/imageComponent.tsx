import type { ItemRendererProps } from 'vantage';
import type { ImageData } from './index';
import s from './image.module.css';

function ImageEdit({ item }: ItemRendererProps<ImageData>) {
  const data = item.data ?? {};
  return (
    <div className={s.content}>
      <img src={data.content} alt={data.label ?? item.label ?? 'image'} draggable={false} />
    </div>
  );
}

function ImagePreview({ item }: ItemRendererProps<ImageData>) {
  const data = item.data ?? {};
  if (!data.content) return null;
  return <img src={data.content} alt={data.label ?? item.label ?? ''} draggable={false} />;
}

export function ImageComponent(props: ItemRendererProps<ImageData>) {
  return props.mode === 'preview' ? <ImagePreview {...props} /> : <ImageEdit {...props} />;
}

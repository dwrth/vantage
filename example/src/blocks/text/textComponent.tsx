import type { ItemRendererProps } from 'vantage';
import type { TextData } from './index';
import s from './text.module.css';

function TextEdit({ item }: ItemRendererProps<TextData>) {
  const data = item.data ?? {};
  const overlay = data.variant === 'overlay';
  const wrapClass = overlay ? `${s.content} ${s.contentOverlay}` : s.content;
  const titleClass = overlay ? `${s.title} ${s.titleOverlay}` : s.title;
  const bodyClass = overlay ? `${s.body} ${s.bodyOverlay}` : s.body;
  return (
    <div className={wrapClass}>
      {data.title && <h3 className={titleClass}>{data.title}</h3>}
      {data.content && <p className={bodyClass}>{data.content}</p>}
    </div>
  );
}

function TextPreview({ item }: ItemRendererProps<TextData>) {
  const data = item.data ?? {};
  const overlay = data.variant === 'overlay';
  const titleClass = overlay ? `${s.previewTitle} ${s.previewTitleOverlay}` : s.previewTitle;
  const bodyClass = overlay ? `${s.previewBody} ${s.previewBodyOverlay}` : s.previewBody;
  return (
    <>
      {data.title && <h3 className={titleClass}>{data.title}</h3>}
      {data.content && <p className={bodyClass}>{data.content}</p>}
    </>
  );
}

export function TextComponent(props: ItemRendererProps<TextData>) {
  return props.mode === 'preview' ? <TextPreview {...props} /> : <TextEdit {...props} />;
}

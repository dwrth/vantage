import type { CSSProperties } from 'react';
import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import type { TextData } from './types';
import { FONT_SIZE_PX, FONT_WEIGHT_VALUE } from './types';

function resolveColor(data: TextData): string | undefined {
  if (data.color) return data.color;
  if (data.variant === 'overlay') return '#ffffff';
  return undefined;
}

function textStyle(data: TextData, role: 'title' | 'body'): CSSProperties {
  const size = data.fontSize ?? 'base';
  const bodyPx = FONT_SIZE_PX[size];
  const titlePx = Math.round(bodyPx * 1.25);
  const weight = data.fontWeight ?? (role === 'title' ? 'semibold' : 'normal');
  const color = resolveColor(data);
  const overlay = data.variant === 'overlay';

  return {
    margin: 0,
    color,
    fontSize: role === 'title' ? titlePx : bodyPx,
    fontWeight: FONT_WEIGHT_VALUE[weight],
    fontStyle: data.italic ? 'italic' : 'normal',
    textAlign: data.align ?? 'left',
    lineHeight: role === 'title' ? 1.2 : 1.55,
    letterSpacing: role === 'title' ? '-0.01em' : undefined,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    textShadow: overlay ? '0 1px 2px rgba(0, 0, 0, 0.75)' : undefined,
  };
}

function TextBody({
  item,
  preview,
}: {
  item: PreviewRendererProps<TextData>['item'];
  preview?: boolean;
}) {
  const data = item.data ?? {};

  return (
    <div
      className={
        preview ? 'flex flex-col gap-2' : 'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3'
      }
    >
      {data.title ? <h3 style={textStyle(data, 'title')}>{data.title}</h3> : null}
      {data.content ? <p style={textStyle(data, 'body')}>{data.content}</p> : null}
    </div>
  );
}

export function TextPreview({ item }: PreviewRendererProps<TextData>) {
  return <TextBody item={item} preview />;
}

export function TextEdit({ item }: EditRendererProps<TextData>) {
  return <TextBody item={item} />;
}

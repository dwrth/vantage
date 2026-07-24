import type { PreviewRendererProps } from '../types';

export function UnknownKind({ item }: PreviewRendererProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        color: '#6b7280',
        padding: '0.5rem',
        textAlign: 'center',
      }}
    >
      Unknown kind: <strong>{item.kind}</strong>
    </div>
  );
}

interface GridOverlayProps {
  width: number;
  height: number;
  gridColumns: number;
  gridRowHeight: number;
}

export default function GridOverlay({
  width,
  height,
  gridColumns,
  gridRowHeight,
}: GridOverlayProps) {
  const rowCount = Math.ceil(height / gridRowHeight);
  const colWidth = width / gridColumns;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <svg
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
        }}
      >
        {/* Vertical lines */}
        {Array.from({ length: gridColumns + 1 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={i * colWidth}
            y1={0}
            x2={i * colWidth}
            y2={height}
            stroke="rgba(59, 130, 246, 0.12)"
            strokeWidth="1"
          />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: rowCount + 1 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * gridRowHeight}
            x2={width}
            y2={i * gridRowHeight}
            stroke="rgba(59, 130, 246, 0.12)"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}

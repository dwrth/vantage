interface GridOverlayProps {
  width: number;
  height: number;
  gridSize?: number;
}

export default function GridOverlay({
  width,
  height,
  gridSize = 50,
}: GridOverlayProps) {
  // Calculate offset to center the grid (equal cutoff on both sides)
  const offsetX = (width % gridSize) / 2;
  const offsetY = (height % gridSize) / 2;

  // Create SVG pattern for rounded squares
  const gap = Math.max(2, Math.floor(gridSize * 0.1)); // 10% gap, minimum 2px
  const squareSize = gridSize - gap; // Larger gap between squares
  const patternId = `grid-pattern-${gridSize}`;

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
        <defs>
          <pattern
            id={patternId}
            x={offsetX}
            y={offsetY}
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <rect
              x={gap / 2}
              y={gap / 2}
              width={squareSize}
              height={squareSize}
              fill="rgba(0, 0, 0, 0.05)"
              stroke="rgba(0, 0, 0, 0.08)"
              strokeWidth="1"
              rx="4"
              ry="4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

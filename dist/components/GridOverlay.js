import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function GridOverlay({ width, height, gridSize = 50 }) {
  // Calculate offset to center the grid (equal cutoff on both sides)
  const offsetX = (width % gridSize) / 2;
  const offsetY = (height % gridSize) / 2;
  // Create SVG pattern for rounded squares
  const gap = Math.max(2, Math.floor(gridSize * 0.1)); // 10% gap, minimum 2px
  const squareSize = gridSize - gap; // Larger gap between squares
  const patternId = `grid-pattern-${gridSize}`;
  return _jsx("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
    },
    children: _jsxs("svg", {
      style: {
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
      },
      children: [
        _jsx("defs", {
          children: _jsx("pattern", {
            id: patternId,
            x: offsetX,
            y: offsetY,
            width: gridSize,
            height: gridSize,
            patternUnits: "userSpaceOnUse",
            children: _jsx("rect", {
              x: gap / 2,
              y: gap / 2,
              width: squareSize,
              height: squareSize,
              fill: "rgba(59, 130, 246, 0.06)",
              stroke: "rgba(59, 130, 246, 0.12)",
              strokeWidth: "1",
              rx: "4",
              ry: "4",
            }),
          }),
        }),
        _jsx("rect", {
          width: "100%",
          height: "100%",
          fill: `url(#${patternId})`,
        }),
      ],
    }),
  });
}

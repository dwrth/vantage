import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function GridOverlay({
  width,
  height,
  gridColumns,
  gridRowHeight,
}) {
  const rowCount = Math.ceil(height / gridRowHeight);
  const colWidth = width / gridColumns;
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
        Array.from({ length: gridColumns + 1 }, (_, i) =>
          _jsx(
            "line",
            {
              x1: i * colWidth,
              y1: 0,
              x2: i * colWidth,
              y2: height,
              stroke: "rgba(59, 130, 246, 0.12)",
              strokeWidth: "1",
            },
            `v-${i}`
          )
        ),
        Array.from({ length: rowCount + 1 }, (_, i) =>
          _jsx(
            "line",
            {
              x1: 0,
              y1: i * gridRowHeight,
              x2: width,
              y2: i * gridRowHeight,
              stroke: "rgba(59, 130, 246, 0.12)",
              strokeWidth: "1",
            },
            `h-${i}`
          )
        ),
      ],
    }),
  });
}

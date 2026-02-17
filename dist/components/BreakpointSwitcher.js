import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function BreakpointSwitcher({ currentBreakpoint, onBreakpointChange, }) {
    const breakpoints = [
        { key: "desktop", label: "Desktop", icon: "🖥️" },
        { key: "tablet", label: "Tablet", icon: "📱" },
        { key: "mobile", label: "Mobile", icon: "📱" },
    ];
    return (_jsx("div", { style: {
            display: "flex",
            gap: "8px",
            padding: "8px",
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }, children: breakpoints.map((bp) => (_jsxs("button", { onClick: () => onBreakpointChange(bp.key), style: {
                padding: "8px 16px",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
                ...(currentBreakpoint === bp.key
                    ? { background: "#2563eb", color: "white" }
                    : { background: "#f3f4f6", color: "#374151" }),
            }, onMouseEnter: (e) => {
                if (currentBreakpoint !== bp.key) {
                    e.currentTarget.style.background = "#e5e7eb";
                }
            }, onMouseLeave: (e) => {
                if (currentBreakpoint !== bp.key) {
                    e.currentTarget.style.background = "#f3f4f6";
                }
            }, children: [_jsx("span", { style: { marginRight: "8px" }, children: bp.icon }), bp.label] }, bp.key))) }));
}

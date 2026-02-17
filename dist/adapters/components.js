import { jsx as _jsx } from "react/jsx-runtime";
// Default component registry
export const defaultComponents = {
    image: ({ src }) => src ? (_jsx("img", { src: src, alt: "", style: { width: "100%", height: "100%", objectFit: "contain" } })) : (_jsx("div", { style: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#9ca3af",
        }, children: "No image" })),
    text: ({ text }) => (_jsx("div", { style: {
            width: "100%",
            height: "100%",
            padding: "8px",
            overflow: "auto",
        }, contentEditable: true, suppressContentEditableWarning: true, children: text })),
    video: ({ url }) => url ? (_jsx("iframe", { src: url, style: { width: "100%", height: "100%", border: 0 }, allowFullScreen: true })) : (_jsx("div", { style: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#9ca3af",
        }, children: "No video URL" })),
};

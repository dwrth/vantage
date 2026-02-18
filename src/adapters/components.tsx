// Component registry interface - allows custom element types

import { ComponentType } from "react";

export type ComponentRegistry<T extends string = string> = {
  [K in T]: ComponentType<any>;
};

// Default component registry
export const defaultComponents: ComponentRegistry<"image" | "text" | "video"> =
  {
    image: ({ src }: { src: string }) =>
      src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#4b5563",
          }}
        >
          No image
        </div>
      ),
    text: ({ text }: { text: string }) => (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "8px",
          overflow: "auto",
        }}
        contentEditable
        suppressContentEditableWarning
      >
        {text}
      </div>
    ),
    video: ({ url }: { url: string }) =>
      url ? (
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: 0 }}
          allowFullScreen
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#4b5563",
          }}
        >
          No video URL
        </div>
      ),
  };

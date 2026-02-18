"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { defaultComponents } from "../adapters/components";
import { pixelsToResponsive } from "../utils/layout";
import { defaultConfig } from "../core/config";
const DEFAULT_CANVAS_HEIGHT = 600;
export function LiveView({
  pageData,
  components = defaultComponents,
  breakpoints = defaultConfig.breakpoints,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
  currentBreakpoint,
}) {
  const generateStyles = () => {
    const containerWidth = currentBreakpoint
      ? breakpoints[currentBreakpoint]
      : breakpoints.desktop;
    // When currentBreakpoint is set, container is fixed to that width (no media queries)
    let css = `
      .page-container {
        position: relative;
        width: ${containerWidth}px;
        max-width: 100%;
        height: ${canvasHeight}px;
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
      }
    `;
    if (!currentBreakpoint) {
      css += `
      /* Fluid scaling for screens between breakpoints */
      @media (max-width: ${breakpoints.desktop}px) {
        .page-container {
          max-width: 100%;
        }
      }
      `;
    }
    css += `
      .page-container > * {
        box-sizing: border-box;
      }
    `;
    const bp = currentBreakpoint ?? "desktop";
    pageData.elements.forEach(element => {
      const layout = element.layout[bp];
      const responsive = pixelsToResponsive(layout);
      css += `
        .element-${element.id} {
          position: absolute;
          left: ${responsive.left}%;
          top: ${responsive.top}%;
          width: ${responsive.width}%;
          height: ${responsive.height}%;
          z-index: ${element.zIndex};
          box-sizing: border-box;
        }
      `;
      if (!currentBreakpoint) {
        const tablet = element.layout.tablet;
        const tabletResponsive = pixelsToResponsive(tablet);
        css += `
          @media (max-width: ${breakpoints.tablet}px) {
            .element-${element.id} {
              left: ${tabletResponsive.left}%;
              top: ${tabletResponsive.top}%;
              width: ${tabletResponsive.width}%;
              height: ${tabletResponsive.height}%;
            }
          }
        `;
        const mobile = element.layout.mobile;
        const mobileResponsive = pixelsToResponsive(mobile);
        css += `
          @media (max-width: ${breakpoints.mobile * 1.28}px) {
            .element-${element.id} {
              left: ${mobileResponsive.left}%;
              top: ${mobileResponsive.top}%;
              width: ${mobileResponsive.width}%;
              height: ${mobileResponsive.height}%;
            }
          }
        `;
      }
    });
    return css;
  };
  return _jsxs("div", {
    style: { minHeight: "100vh", background: "#f9fafb" },
    children: [
      _jsx("style", { dangerouslySetInnerHTML: { __html: generateStyles() } }),
      _jsx("div", {
        className: "page-container",
        children: pageData.elements.map(element => {
          const Component = components[element.type];
          if (!Component) return null;
          return _jsx(
            "div",
            {
              className: `element-${element.id}`,
              children: _jsx(Component, { ...element.content }),
            },
            element.id
          );
        }),
      }),
    ],
  });
}

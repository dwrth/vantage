"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { defaultComponents } from "../adapters/components";
import { pixelsToResponsive, getPageTotalHeight, } from "../utils/layout";
import { defaultConfig } from "../core/config";
const DEFAULT_CANVAS_HEIGHT = 600;
export function LiveView({ pageData, components = defaultComponents, breakpoints = defaultConfig.breakpoints, canvasHeight = DEFAULT_CANVAS_HEIGHT, currentBreakpoint, }) {
    const sections = pageData.sections ?? [];
    const containerWidth = currentBreakpoint
        ? breakpoints[currentBreakpoint]
        : breakpoints.desktop;
    const defaultSectionHeight = defaultConfig.defaultSectionHeight ?? 600;
    const pageTotalHeight = getPageTotalHeight(pageData.sections, defaultSectionHeight);
    const generateStyles = () => {
        const bp = currentBreakpoint ?? "desktop";
        let css = `
      .live-view-column {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-height: ${pageTotalHeight}px;
        background: #f9fafb;
      }
      .live-view-section {
        position: relative;
        box-sizing: border-box;
      }
      .live-view-section.full-width {
        width: 100%;
      }
      .live-view-section.content-width {
        max-width: 100%;
        margin-left: auto;
        margin-right: auto;
      }
      .live-view-section-inner {
        position: relative;
        max-width: 100%;
        margin: 0 auto;
        box-sizing: border-box;
      }
    `;
        sections.forEach(section => {
            const sectionWidth = section.width ?? containerWidth;
            css += `
        .live-view-section-${section.id} {
          min-height: ${section.height}px;
          ${!section.fullWidth ? `width: ${sectionWidth}px;` : ""}
        }
        .live-view-section-${section.id} .live-view-section-inner {
          height: ${section.height}px;
          ${!section.fullWidth ? `width: ${sectionWidth}px;` : `width: ${containerWidth}px;`}
        }
      `;
            const sectionElements = (pageData.elements ?? []).filter((el) => el.sectionId === section.id);
            sectionElements.forEach(element => {
                const layout = element.layout[bp];
                const responsive = pixelsToResponsive(layout);
                css += `
          .live-view-section-${section.id} .element-${element.id} {
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
              .live-view-section-${section.id} .element-${element.id} {
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
              .live-view-section-${section.id} .element-${element.id} {
                left: ${mobileResponsive.left}%;
                top: ${mobileResponsive.top}%;
                width: ${mobileResponsive.width}%;
                height: ${mobileResponsive.height}%;
              }
            }
          `;
                }
            });
        });
        css += `
      .live-view-section > * {
        box-sizing: border-box;
      }
    `;
        return css;
    };
    return (_jsxs("div", { style: { minHeight: "100vh", background: "#f9fafb" }, children: [_jsx("style", { dangerouslySetInnerHTML: { __html: generateStyles() } }), _jsx("div", { className: "live-view-column", children: sections.map(section => {
                    const sectionElements = (pageData.elements ?? []).filter((el) => el.sectionId === section.id);
                    return (_jsx("div", { className: `live-view-section live-view-section-${section.id} ${section.fullWidth ? "full-width" : "content-width"}`, children: _jsx("div", { className: "live-view-section-inner", children: sectionElements.map(element => {
                                const Component = components[element.type];
                                if (!Component)
                                    return null;
                                return (_jsx("div", { className: `element-${element.id}`, children: _jsx(Component, { ...element.content }) }, element.id));
                            }) }) }, section.id));
                }) })] }));
}

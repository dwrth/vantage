"use client";

import React from "react";
import { PageData, Breakpoint } from "../core/types";
import { ComponentRegistry, defaultComponents } from "../adapters/components";
import {
  pixelsToResponsive,
  getCanvasWidth,
  getPageTotalHeight,
} from "../utils/layout";
import { defaultConfig } from "../core/config";

interface LiveViewProps<T extends string = string> {
  pageData: PageData<T>;
  components?: ComponentRegistry<T>;
  breakpoints?: Record<string, number>;
  /** Canvas height (px). Use same as editor (e.g. 600) so layout matches. */
  canvasHeight?: number;
  /** When set (e.g. in editor preview), use this breakpoint's layout and width so device buttons work. */
  currentBreakpoint?: Breakpoint;
}

const DEFAULT_CANVAS_HEIGHT = 600;

export function LiveView<T extends string = string>({
  pageData,
  components = defaultComponents as ComponentRegistry<T>,
  breakpoints = defaultConfig.breakpoints!,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
  currentBreakpoint,
}: LiveViewProps<T>) {
  const sections = pageData.sections ?? [];
  const containerWidth = currentBreakpoint
    ? breakpoints[currentBreakpoint]
    : breakpoints.desktop;
  const defaultSectionHeight = defaultConfig.defaultSectionHeight ?? 600;
  const pageTotalHeight = getPageTotalHeight(
    pageData.sections,
    defaultSectionHeight
  );

  const generateStyles = () => {
    const bp: Breakpoint = currentBreakpoint ?? "desktop";

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

      const sectionElements = (pageData.elements ?? []).filter(
        (el: { sectionId?: string }) => el.sectionId === section.id
      );
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

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <style dangerouslySetInnerHTML={{ __html: generateStyles() }} />
      <div className="live-view-column">
        {sections.map(section => {
          const sectionElements = (pageData.elements ?? []).filter(
            (el: { sectionId?: string }) => el.sectionId === section.id
          );
          return (
            <div
              key={section.id}
              className={`live-view-section live-view-section-${section.id} ${
                section.fullWidth ? "full-width" : "content-width"
              }`}
            >
              <div className="live-view-section-inner">
                {sectionElements.map(element => {
                  const Component = components[element.type as T];
                  if (!Component) return null;
                  return (
                    <div key={element.id} className={`element-${element.id}`}>
                      <Component {...(element.content as any)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

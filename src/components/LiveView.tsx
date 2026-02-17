"use client";

import React from "react";
import { PageData } from "../core/types";
import { ComponentRegistry, defaultComponents } from "../adapters/components";
import { pixelsToResponsive, getCanvasWidth } from "../utils/layout";
import { defaultConfig } from "../core/config";

interface LiveViewProps<T extends string = string> {
  pageData: PageData<T>;
  components?: ComponentRegistry<T>;
  breakpoints?: Record<string, number>;
}

export function LiveView<T extends string = string>({
  pageData,
  components = defaultComponents as ComponentRegistry<T>,
  breakpoints = defaultConfig.breakpoints!,
}: LiveViewProps<T>) {
  const generateStyles = () => {
    let css = `
      .page-container {
        position: relative;
        width: 100%;
        max-width: ${breakpoints.desktop}px;
        margin: 0 auto;
        min-height: 100vh;
        background: white;
      }
      
      /* Fluid scaling for screens between breakpoints */
      @media (max-width: ${breakpoints.desktop}px) {
        .page-container {
          max-width: 100%;
        }
      }
      
      /* Ensure elements scale smoothly */
      .page-container > * {
        box-sizing: border-box;
      }
    `;

    pageData.elements.forEach((element) => {
      // Use responsive layout if available, otherwise calculate from desktop
      const responsive =
        element.layout.responsive ||
        pixelsToResponsive(
          element.layout.desktop,
          getCanvasWidth("desktop", breakpoints),
          defaultConfig.defaultCanvasHeight!,
        );

      // Base styles using percentages for fluid responsiveness
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

      // Tablet breakpoint - uses percentage-based positioning
      const tablet = element.layout.tablet;
      const tabletResponsive = pixelsToResponsive(
        tablet,
        getCanvasWidth("tablet", breakpoints),
        defaultConfig.defaultCanvasHeight!,
      );

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

      // Mobile breakpoint - uses percentage-based positioning
      const mobile = element.layout.mobile;
      const mobileResponsive = pixelsToResponsive(
        mobile,
        getCanvasWidth("mobile", breakpoints),
        defaultConfig.defaultCanvasHeight!,
      );

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
    });
    return css;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <style dangerouslySetInnerHTML={{ __html: generateStyles() }} />
      <div className="page-container">
        {pageData.elements.map((element) => {
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
}

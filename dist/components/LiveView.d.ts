import { PageData, Breakpoint } from "../core/types";
import { ComponentRegistry } from "../adapters/components";
interface LiveViewProps<T extends string = string> {
  pageData: PageData<T>;
  components?: ComponentRegistry<T>;
  breakpoints?: Record<string, number>;
  /** Canvas height (px). Use same as editor (e.g. 600) so layout matches. */
  canvasHeight?: number;
  /** When set (e.g. in editor preview), use this breakpoint's layout and width so device buttons work. */
  currentBreakpoint?: Breakpoint;
  /** Grid columns (must match editor gridConfig). */
  gridColumns?: number;
  /** Grid row height in px (must match editor gridConfig). */
  gridRowHeight?: number;
}
export declare function LiveView<T extends string = string>({
  pageData,
  components,
  breakpoints,
  canvasHeight,
  currentBreakpoint,
  gridColumns,
  gridRowHeight,
}: LiveViewProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=LiveView.d.ts.map

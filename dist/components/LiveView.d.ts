import { PageData } from "../core/types";
import { ComponentRegistry } from "../adapters/components";
interface LiveViewProps<T extends string = string> {
  pageData: PageData<T>;
  components?: ComponentRegistry<T>;
  breakpoints?: Record<string, number>;
}
export declare function LiveView<T extends string = string>({
  pageData,
  components,
  breakpoints,
}: LiveViewProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=LiveView.d.ts.map

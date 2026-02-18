import { ComponentType } from "react";
export type ComponentRegistry<T extends string = string> = {
  [K in T]: ComponentType<any>;
};
export declare const defaultComponents: ComponentRegistry<
  "image" | "text" | "video"
>;
//# sourceMappingURL=components.d.ts.map

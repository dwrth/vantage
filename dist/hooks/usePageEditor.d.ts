import { PageBuilderConfig } from "../core/config";
import type { VantageEditorInstance } from "../core/editor-instance";
export type UseVantageEditorOptions<T extends string = string> = {
    pageId: string;
} & PageBuilderConfig<T>;
export declare function useVantageEditor<T extends string = string>(options: UseVantageEditorOptions<T>): VantageEditorInstance<T>;
export declare function usePageEditor<T extends string = string>(pageId: string, config?: PageBuilderConfig<T>): VantageEditorInstance<T>;
//# sourceMappingURL=usePageEditor.d.ts.map
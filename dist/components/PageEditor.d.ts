import { PageBuilderConfig } from "../core/config";
interface PageEditorProps<T extends string = string> {
    pageId: string;
    config?: PageBuilderConfig<T>;
}
export declare function PageEditor<T extends string = string>({ pageId, config, }: PageEditorProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageEditor.d.ts.map
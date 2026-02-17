export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export interface LayoutRect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface ResponsiveRect {
    left: number;
    top: number;
    width: number;
    height: number;
}
export interface ElementLayout {
    desktop: LayoutRect;
    tablet: LayoutRect;
    mobile: LayoutRect;
    responsive?: ResponsiveRect;
}
export interface PageElement<T extends string = string> {
    id: string;
    type: T;
    content: Record<string, any>;
    layout: ElementLayout;
    zIndex: number;
}
export interface PageData<T extends string = string> {
    pageId: string;
    elements: PageElement<T>[];
}
//# sourceMappingURL=types.d.ts.map
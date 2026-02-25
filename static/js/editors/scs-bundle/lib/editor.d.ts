export declare class SCsEditor {
    private _container;
    private _editor;
    constructor(container: HTMLElement, value?: string, theme?: string);
    get content(): string;
    set content(newValue: string);
}

export interface FormOptions<T = any> {
    autoSubmit?: boolean;
    debounceTimeMs?: number;
    transformCallback?: (values: T) => T;
    submitCallback?: (values: T) => Promise<any>;
    translationPrefix?: string;
    translator?: TranslationFunction;
}

export type TranslationFunction = (key: string, params?: Record<string, any>) => string;
export interface IValidatable {
    getValue(): any;
    getValidators(): Function[];
    getPath(): string;
}

export type ValidationErrors = { [key: string]: string | null };
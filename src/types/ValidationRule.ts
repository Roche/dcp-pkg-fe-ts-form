export type ValidationRule = null
    | string
    | ((value: any) => { [key: string]: string } | null)
    | ((value: any) => { [key: string]: string } | null)[];
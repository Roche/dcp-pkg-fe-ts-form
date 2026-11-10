import { FormControl } from "../components/FormControl";
import { FormGroup } from "../components/FormGroup";
import { FormArray } from "../components/FormArray";

export function getPath(instance: { parent?: any; name: string | null; index?: number }): string {
    if (!instance.parent) {
        return instance.name ?? '';
    }

    let path = instance.parent.getPath();
    if (instance.index !== undefined) {
        path += `[${instance.index}]`;
    }
    // Only append name if it exists and is not empty
    if (instance.name) {
        path += `.${instance.name}`;
    }
    return path;
}

export function parsePath(path: string): string[] {
    return path
        .replace(/\[(\d+)\]/g, '.$1') // Convert array notation to dot notation (e.g., form.array[0] -> form.array.0)
        .split('.')                   // Split into path segments
}

export function isPlainControlObject(obj: any): obj is { [key: string]: any } {
    return typeof obj === "object" 
        && obj !== null 
        && !(obj instanceof FormControl) 
        && !(obj instanceof FormGroup) 
        && !(obj instanceof FormArray);
}
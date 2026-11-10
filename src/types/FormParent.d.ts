import { FormControl } from "../components/FormControl";
import { FormGroup } from "../components/FormGroup";
import { FormArray } from "../components/FormArray";

export type FormParent<T> = FormGroup<T> | FormService<T> | FormArray<T>;

export type FormControlType<T> = FormControl<T | null> | FormGroup<T & Record<string, any>> | FormArray<T>;

export type FormArrayItem<T> = 
    | { [key: string]: FormControlType<T> }
    | FormControlType<T>;

export type FormArrayItems<T> = Array<FormArrayItem<T>>;
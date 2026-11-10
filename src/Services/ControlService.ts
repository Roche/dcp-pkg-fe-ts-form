import { FormControl } from "../components/FormControl";
import { FormGroup } from "../components/FormGroup";
import { FormArray } from "../components/FormArray";
import { ValidationService } from "../Validation/ValidationService";
import { ValidationRule } from "../types/ValidationRule";
import type { FormService } from "../FormService";
import { logger } from "@open-dcp/utilities";

export class ControlService<T extends Record<string, any>> {

    controls: {
        [K in keyof T]: FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]>
    } = {} as any;

    parent?: FormGroup<T> | FormService<T>;

    public getPath(name: string, index?: number): string {
        const path = this.parent ? this.parent.getPath() + '.' : '';
        return index !== undefined ? `${path}${index}.${name}` : `${path}${name}`;
    }

    public addControl<K extends keyof T>(
        control: FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]>,
        validation?: ValidationRule,
        index?: number
    ): FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]> | null {
        if (this.controls[control.name as K]) {
            logger.warn(`Control with name "${String(control.name)}" was already registered.`);
            return this.controls[control.name as K];
        }

        if (control instanceof FormControl) {
            control.index = index;

            if (validation) {
                control.setValidators(
                    ValidationService.parseValidation(validation)
                );
            }
        }

        control.parent = this.parent;
        this.controls[control.name as K] = control;

        return this.controls[control.name as K];
    }

    public getControl<K extends keyof T>(name: K): FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]> | null {
        if (this.controls[name]) {
            return this.controls[name];
        }

        return null;
    }

    public getControls() {
        return this.controls;
    }

    public getValues(): { [K in keyof T]: T[K] | null } {
        const values: Partial<{ [K in keyof T]: T[K] | null }> = {};

        Object.keys(this.controls).forEach((key) => {
            const control = this.controls[key as keyof T];

            if (control instanceof FormControl) {
                if (control.disabled$.getValue() === false) {
                    values[key as keyof T] = control.getValue();
                }
            } else if (control instanceof FormGroup) {
                values[key as keyof T] = control.getValues() as T[keyof T];
            } else if (control instanceof FormArray) {
                values[key as keyof T] = control.getValues() as T[keyof T];
            }
        });

        return values as { [K in keyof T]: T[K] | null };
    }

    removeControl(name: string): void {
        delete this.controls[name]; // Remove control reference
    }
}

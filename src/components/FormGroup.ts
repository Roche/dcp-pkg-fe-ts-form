import { FormControl } from "./FormControl";
import { FormArray } from "./FormArray";
import { ControlService } from "../Services/ControlService";
import { BehaviorSubject } from "rxjs";
import { getPath } from "../mixins/utilities";
import { FormParent } from "../types/FormParent";

export class FormGroup<T extends Record<string, any>> {
    name: string | null;
    parent?: FormParent<T>;
    index?: number;
    controlService: ControlService<T>;

    touched$ = new BehaviorSubject<boolean>(false);
    valid$ = new BehaviorSubject<boolean>(true);
    required$ = new BehaviorSubject<boolean>(false);

    constructor(name: string | null = null) {
        this.name = name;
        this.controlService = new ControlService();
        this.controlService.parent = this;
    }

    get dirty(): boolean {
        return Object.values(this.getControls()).some(ctrl =>
            (ctrl instanceof FormControl && ctrl.dirty$.getValue()) ||
            (ctrl instanceof FormGroup && ctrl.dirty) ||
            (ctrl instanceof FormArray && ctrl.dirty)
        );
    }

    get pristine(): boolean {
        return !this.dirty;
    }

    getPath(): string {
        return getPath(this)
    }

    public getControlsRecursive(): FormControl<any>[] {
        const controls: FormControl<any>[] = [];
        Object.entries(this.getControls()).forEach(([key, control]) => {
            if (control instanceof FormControl) {
                controls.push(control);
            } else if (control instanceof FormGroup || control instanceof FormArray) {
                // Recurse for nested groups and arrays
                controls.push(...control.getControlsRecursive());
            }
        });
        return controls;
    }

    addControl<K extends keyof T>(
        control: FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]>,
        validation?: string
    ): FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]> | null {
        return this.controlService.addControl(control, validation)
    }

    getControl<K extends keyof T>(name: K): FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]> | null {
        return this.controlService.getControl(name);
    }

    getControls() {
        return this.controlService.getControls();
    }

    getValue(name: string | null): T | null {
        if (!name) {
            return null;
        }
        const control = this.getControl(name);

        if (!control) {
            return null;
        }

        if (control instanceof FormControl) {
            return control.getValue();
        }

        return null;
    }

    getValues(): { [K in keyof T]: T[K] | null } {
        return this.controlService.getValues();
    }
}

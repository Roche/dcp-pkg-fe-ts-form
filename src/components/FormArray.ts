import { FormControl } from "./FormControl";
import { FormGroup } from "./FormGroup";
import { ArrayService } from "../Services/ArrayService";
import { ControlService } from "../Services/ControlService";
import { ValidationRule } from "../types/ValidationRule";
import { FormService } from "../FormService";
import { getPath, isPlainControlObject } from "../mixins/utilities";
import { FormParent, FormControlType, FormArrayItems } from "../types/FormParent";

function isFormArray<T>(control: any): control is FormArray<T> {
    return control instanceof FormArray;
}

export class FormArray<T> {
    arrayService: ArrayService<T>;
    name: string;
    controlService: ControlService<T & Record<string, any>>;
    parent?: FormParent<T>;
    index?: number;

    constructor(
        name: string,
        formService: FormService<T & Record<string, any>>,
        ControlService: ControlService<T & Record<string, any>>,
        defaults?: Record<string, any>
    ) {
        this.name = name;
        this.controlService = ControlService;
        this.arrayService = new ArrayService(formService, this, defaults);
        this.arrayService.parent = this;
    }

    get dirty(): boolean {
        return this.getControlsRecursive().some(ctrl => ctrl.dirty$.getValue());
    }

    get pristine(): boolean {
        return !this.dirty;
    }

    getPath(): string {
        return getPath(this);
    }

    public clearControls(): void {
        this.arrayService.clearControls();
    }

    public getControlItems() {
        return this.arrayService.getItems();
    }

    public getItems() {
        return this.arrayService.getRenderedItems();
    }

    public destroy(): void {
        this.arrayService.destroy();
    }

    public getControlsRecursive(): FormControl<any>[] {
        const controls: FormControl<any>[] = [];

        this.getControls().forEach((item) => {
            // If it's a plain object (named control/group)
            if (
                typeof item === "object" &&
                item !== null &&
                !(item instanceof FormControl) &&
                !(item instanceof FormGroup) &&
                !(item instanceof FormArray)
            ) {
                Object.values(item).forEach((control) => {
                    if (control instanceof FormControl) {
                        controls.push(control);
                    } else if (control instanceof FormGroup || control instanceof FormArray) {
                        controls.push(...control.getControlsRecursive());
                    }
                });
            }
            // If it's a direct instance (unnamed group/control)
            else if (item instanceof FormControl) {
                controls.push(item);
            } else if (item instanceof FormGroup || item instanceof FormArray) {
                controls.push(...item.getControlsRecursive());
            }
        });

        return controls;
    }

    public updateInitialValues(newInitialValues: Array<Record<string, any>>): void {
        this.arrayService.updateInitialValues(newInitialValues)
    }

    public addItem(defaultValues?: Record<string, any>): void {
        this.arrayService.addItem(defaultValues);
    }

    public removeItem(index: number): void {
        this.arrayService.removeItem(index)
    }

    public addControl(
        control: FormControl<T | null> | FormGroup<T & Record<string, any>>,
        validation?: ValidationRule,
        index?: number
    ): FormControl<T | null> | FormGroup<T & Record<string, any>> {
        this.arrayService.addControl(control, validation, index);
        return control;
    }

    public getControls(): FormArrayItems<T> {
        return this.arrayService.getControls();
    }

    public getControl(index: number, name: string): FormControlType<T> | null {
        return this.arrayService.getControl(index, name);
    }

    public getValues(): { [key: string]: any }[] {
        const values: { [key: string]: any }[] = [];

        this.getControls().forEach((controlObj) => {
            // If it's a plain object (named control/group)
            if (
                typeof controlObj === "object" &&
                controlObj !== null &&
                !(controlObj instanceof FormControl) &&
                !(controlObj instanceof FormGroup) &&
                !(controlObj instanceof FormArray)
            ) {
                const name = Object.keys(controlObj)[0];
                const control = controlObj[name];

                if (control instanceof FormGroup && !control.name) {
                    // Unnamed group: merge its values directly
                    values.push(control.getValues());
                } else if (control instanceof FormControl) {
                    values.push({ [name]: control.getValue() });
                } else if (control instanceof FormGroup) {
                    values.push({ [name]: control.getValues() });
                } else if (isFormArray(control)) {
                    values.push({ [name]: control.getValues() });
                }

            } else if (controlObj instanceof FormControl) {
                values.push({ [controlObj.name]: controlObj.getValue() });
            } else if (controlObj instanceof FormGroup) {
                if (typeof controlObj.name === "string" && controlObj.name) {
                    values.push({ [controlObj.name]: controlObj.getValues() });
                } else {
                    values.push(controlObj.getValues());
                }
            } else if (isFormArray(controlObj)) {
                values.push({ [controlObj.name]: controlObj.getValues() });
            }
        });

        return values;
    }
}

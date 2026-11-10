import { FormControl } from "../../components/FormControl";
import { FormGroup } from "../../components/FormGroup";
import { FormArray } from "../../components/FormArray";
import { FormService } from "../../FormService";

export class ControlManager<T> {
    constructor(private formService: FormService<T & Record<string, any>>) { }

    updateControlIndices(items: any[]): void {
        items.forEach((item, newIndex) => {
            if (item instanceof FormControl || item instanceof FormGroup || item instanceof FormArray) {
                item.index = newIndex;
            } else if (typeof item === 'object' && item !== null) {
                Object.values(item).forEach(control => {
                    if (control instanceof FormControl || control instanceof FormGroup || control instanceof FormArray) {
                        control.index = newIndex;
                    }
                });
            }
        });
    }

    unregisterControl(control: FormControl<T | null> | FormGroup<T & Record<string, any>> | FormArray<T>): void {
        if (control instanceof FormControl) {
            control.destroy();
        }

        if (control instanceof FormGroup) {
            Object.values(control.getControlsRecursive()).forEach(ctrl => this.unregisterControl(ctrl));
        }

        if (control instanceof FormArray) {
            control.getControlItems().forEach(ctrl => this.unregisterControl(ctrl));
        }

        if (this.formService) {
            this.formService.unregisterControl(control.getPath());
        }
    }

    unregisterItemControls(item: Record<string, any>): void {
        Object.values(item).forEach((control) => {
            if (control instanceof FormControl) {
                this.unregisterControl(control);
            } else if (control instanceof FormGroup) {
                Object.values(control.getControlsRecursive()).forEach(ctrl => this.unregisterControl(ctrl));
            } else if (control instanceof FormArray) {
                control.getControlItems().forEach(ctrl => this.unregisterControl(ctrl));
            }
        });
    }
}
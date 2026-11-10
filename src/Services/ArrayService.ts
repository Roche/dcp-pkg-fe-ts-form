import { BehaviorSubject, Observable, debounceTime } from "rxjs";
import { FormControl } from "../components/FormControl";
import { FormGroup } from "../components/FormGroup";
import { FormArray } from "../components/FormArray";
import { ValidationRule } from "../types/ValidationRule";
import { ValidationService } from "../Validation/ValidationService";
import { FormService } from "../FormService";
import { FormControlType, FormArrayItems } from "../types/FormParent";
import { ControlManager } from "../mixins/array/ControlManager";
import { parsePath } from "../mixins/utilities";
import { isEqual } from "lodash-es";

export class ArrayService<T> {
    parent: FormArray<T>;
    defaults: Record<string, any>;

    private items$: BehaviorSubject<FormArrayItems<T>>;
    private renderedItems$: BehaviorSubject<Array<Record<string, any>>>;
    private formService: FormService<T & Record<string, any>>;
    private controlManager: ControlManager<T>;
    private formValueSubscription: any;
    private skipNextSync = false;

    constructor(formService: FormService<T & Record<string, any>>, parent: FormArray<T>, defaults?: Record<string, any>) {
        this.items$ = new BehaviorSubject([] as FormArrayItems<T>);
        this.formService = formService;
        this.parent = parent;
        this.controlManager = new ControlManager(formService);

        const renderedValues = this.getContainingArrayValues();
        const initialValues = renderedValues !== undefined
            ? renderedValues
            : this.formService.getInitialValues(
                this.parent.controlService.getPath(parent.name)
            );

        if (initialValues && typeof initialValues[Symbol.iterator] === 'function') {
            this.renderedItems$ = new BehaviorSubject([...initialValues] as Array<Record<string, any>>);
        } else {
            this.renderedItems$ = new BehaviorSubject([] as Array<Record<string, any>>);
        }

        this.defaults = defaults ?? {};
        this.subscribeToFormChanges();
    }

    private getContainingArrayValues(): unknown {
        const path = [this.parent.name];
        // The new array is not registered yet, but its containing group already is.
        let group = this.parent.controlService.parent;

        while (group instanceof FormGroup) {
            if (group.name) {
                path.unshift(group.name);
            }

            if (group.parent instanceof FormArray) {
                if (group.index === undefined) {
                    return undefined;
                }

                let value: unknown = group.parent.arrayService.getRenderedItems()[group.index];
                for (const key of path) {
                    if (value === null || typeof value !== 'object') {
                        return undefined;
                    }
                    value = Reflect.get(value, key);
                }
                return value;
            }

            if (!(group.parent instanceof FormGroup)) {
                break;
            }
            group = group.parent;
        }

        return undefined;
    }

    private subscribeToFormChanges(): void {
        this.formValueSubscription = this.formService.valueChangeSubject
            .pipe(debounceTime(10))
            .subscribe(() => {
                if (this.items$.getValue().length > 0) {
                    this.syncRenderedItemsFromControls();
                }
            });
    }

    private syncRenderedItemsFromControls(): void {
        if (this.skipNextSync) {
            this.skipNextSync = false;
            return;
        }

        const arrayPath = this.parent.getPath();
        const allFormValues = this.formService.getFormValues();

        // Navigate to this array's values in the form
        const pathParts = parsePath(arrayPath);
        let arrayValues: any = allFormValues;

        for (const part of pathParts) {
            if (arrayValues && typeof arrayValues === 'object') {
                arrayValues = arrayValues[part];
            } else {
                arrayValues = [];
                break;
            }
        }

        // Use lighter comparison first - check if it's still an array and same length
        const currentRendered = this.getRenderedItems();
        if (!Array.isArray(arrayValues) || arrayValues.length !== currentRendered.length) {
            this.forceRenderedItemsUpdate(Array.isArray(arrayValues) ? arrayValues : []);
            return;
        }

        // Only do deep comparison if length matches (most common case during typing)
        if (!isEqual(currentRendered, arrayValues)) {
            this.forceRenderedItemsUpdate(arrayValues);
        }
    }

    // For immediate updates (when you need them)
    private forceRenderedItemsUpdate(items: Array<Record<string, any>>): void {
        this.renderedItems$.next(items);
    }

    public destroy(): void {
        if (this.formValueSubscription) {
            this.formValueSubscription.unsubscribe(); // NEW
        }
    }

    public updateInitialValues(newInitialValues: Array<Record<string, any>>): void {
        this.renderedItems$.next([...newInitialValues]);
    }

    public getItems(): Array<FormControlType<T>> {
        return this.items$.getValue().map(item => {
            if (item instanceof FormControl || item instanceof FormGroup || item instanceof FormArray) {
                return item;
            }
            return Object.values(item)[0];
        });
    }

    public getRenderedItems$(): Observable<Array<Record<string, any>>> {
        return this.renderedItems$.asObservable();
    }

    public getRenderedItems(): Array<Record<string, any>> {
        return this.renderedItems$.getValue();
    }

    public getPath(name: string, index?: number): string {
        const path = this.parent ? this.parent.getPath() + '.' : '';
        return index !== undefined ? `${path}${index}.${name}` : `${path}${name}`;
    }

    public addItem(defaultValues?: Record<string, any>): void {
        const newItem = defaultValues ?? this.defaults;
        const currentRendered = this.renderedItems$.getValue();
        this.skipNextSync = true;
        this.forceRenderedItemsUpdate([...currentRendered, newItem]);
    }

    public reorder(fromIndex: number, toIndex: number): void {
        if (fromIndex === toIndex) return;

        // Reorder items$ first
        const items = [...this.items$.getValue()];
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        this.items$.next(items);

        // Reorder renderedItems$ to match - use force update to avoid debounce issues
        const renderedItems = [...this.renderedItems$.getValue()];
        const [movedRendered] = renderedItems.splice(fromIndex, 1);
        renderedItems.splice(toIndex, 0, movedRendered);
        this.forceRenderedItemsUpdate(renderedItems);

        // Update control indices
        this.controlManager.updateControlIndices(items);
        this.formService.triggerUpdateEvent();
    }

    public removeItem(index: number): void {
        const currentControls = this.items$.getValue();
        const currentRenderedItems = this.renderedItems$.getValue();

        if (!currentControls[index] || !currentRenderedItems[index]) return;

        const controlItem = currentControls[index];

        // Recursively destroy all controls in the item
        this.destroyControlItem(controlItem, index);

        // Remove from arrays
        const updatedRenderedItems = [...currentRenderedItems.slice(0, index), ...currentRenderedItems.slice(index + 1)];
        this.forceRenderedItemsUpdate(updatedRenderedItems);

        const updatedControls = [...currentControls.slice(0, index), ...currentControls.slice(index + 1)];
        this.items$.next(updatedControls);

        // Reindex remaining subscriptions and update control indices
        this.controlManager.updateControlIndices(updatedControls);

        this.formService.triggerUpdateEvent();
    }

    private destroyControlItem(controlItem: any, index: number): void {
        if (typeof controlItem === 'object' && controlItem !== null &&
            !(controlItem instanceof FormControl || controlItem instanceof FormGroup || controlItem instanceof FormArray)) {
            // It's a plain object with named controls
            Object.entries(controlItem).forEach(([name, control]) => {
                this.destroyControl(control as any, index, name);
            });
        } else if (controlItem instanceof FormControl) {
            // It's a direct FormControl
            this.destroyControl(controlItem, index, controlItem.name);
        } else if (controlItem instanceof FormGroup || controlItem instanceof FormArray) {
            // It's a direct FormGroup or FormArray
            this.destroyControl(controlItem, index, controlItem.name!);
        }
    }

    private destroyControl(control: FormControl<any> | FormGroup<any> | FormArray<any>, index: number, name: string): void {
        // Recursively destroy nested controls
        if (control instanceof FormGroup) {
            const nestedControls = control.getControls();
            Object.values(nestedControls).forEach(nestedControl => {
                if (nestedControl instanceof FormControl) {
                    nestedControl.destroy();
                } else if (nestedControl instanceof FormGroup || nestedControl instanceof FormArray) {
                    this.destroyNestedControl(nestedControl);
                }
            });
        } else if (control instanceof FormArray) {
            control.destroy();
        } else if (control instanceof FormControl) {
            control.destroy();
        }

        // Unregister from control manager
        this.controlManager.unregisterItemControls({ [name]: control });
    }

    private destroyNestedControl(control: FormGroup<any> | FormArray<any>): void {
        if (control instanceof FormGroup) {
            const controls = control.getControls();
            Object.values(controls).forEach(ctrl => {
                if (ctrl instanceof FormControl) {
                    ctrl.destroy();
                } else if (ctrl instanceof FormGroup || ctrl instanceof FormArray) {
                    this.destroyNestedControl(ctrl);
                }
            });
        } else if (control instanceof FormArray) {
            control.destroy();
        }
    }

    public clearControls(): void {
        this.items$.next([]);
    }

    public addControl(
        control: FormControl<T | null> | FormGroup<T & Record<string, any>> | FormArray<T>,
        validation?: ValidationRule,
        index?: number
    ): void {
        control.index = index;
        control.parent = this.parent;

        if (control instanceof FormControl) {
            if (validation) {
                control.setValidators(ValidationService.parseValidation(validation));
            }
        }

        const currentItems = this.items$.getValue();
        const updatedItems = [
            ...currentItems,
            control.name ? { [String(control.name)]: control } : control
        ];
        this.items$.next(updatedItems);
    }

    public getControl(index: number, name: string): FormControlType<T> | null {
        const items = this.items$.getValue();
        const item = items[index];

        if (!item) return null;

        if (typeof item === 'object' && item !== null && name in item) {
            return (item as { [x: string]: FormControlType<T> })[name];
        }

        if (
            (item instanceof FormControl || item instanceof FormGroup || item instanceof FormArray) &&
            item.name === name
        ) {
            return item;
        }

        if (item instanceof FormGroup && (!item.name || item.name === null)) {
            return item.getControl(name);
        }

        return null;
    }

    public getControls(): FormArrayItems<T> {
        return this.items$.getValue();
    }

    public getControls$(): BehaviorSubject<FormArrayItems<T>> {
        return this.items$;
    }
}
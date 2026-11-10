import { BehaviorSubject, of, Subscription, Subject, Observable, distinctUntilChanged, map, debounceTime } from "rxjs";
import { FormControl } from "./components/FormControl";
import { FormGroup } from "./components/FormGroup";
import { FormArray } from "./components/FormArray";
import { ValidationService } from "./Validation/ValidationService";
import { ControlService } from "./Services/ControlService";
import { parsePath } from "./mixins/utilities";
import { FormOptions } from "./types/FormOptions";
import type { ValidationErrors } from "./interfaces/IValidatable";

export class FormService<T extends Record<string, any>> {
    controlService: ControlService<T>;
    shouldAutoSubmit: boolean = false;
    autoSubmitDebounceTime: number = 300;
    initialValues: T = {} as T;

    valid$ = new BehaviorSubject<boolean>(true);

    private transformCallback?: (values: T) => T;
    private submitCallback?: (values: T) => Promise<any>;
    private subscriptionsMap: Map<string, Subscription> = new Map();

    public valueChangeSubject = new BehaviorSubject<void>(undefined);

    private submitEvent: Subject<{ data: T, errors: T, status: 'submitted' | 'failed' }> = new Subject();

    constructor(
        initialValues: T = {} as T,
        options?: FormOptions
    ) {
        this.initialValues = initialValues;
        this.controlService = new ControlService();
        this.shouldAutoSubmit = options?.autoSubmit ?? false;
        this.autoSubmitDebounceTime = options?.debounceTimeMs ?? 500;
        this.transformCallback = options?.transformCallback;
        this.submitCallback = options?.submitCallback;

        if (options?.translationPrefix) {
            ValidationService.setTranslationPrefix(options.translationPrefix);
        }

        if (options?.translator) {
            ValidationService.setTranslator(options.translator);
        }

        this.valueChangeSubject.pipe(
            debounceTime(this.autoSubmitDebounceTime),
            map(() => {
                return of(this.onControlValueChange());
            })
        ).subscribe();
    }

    public setAutoSubmit(enabled: boolean): void {
        this.shouldAutoSubmit = enabled;
    }

    public destroy(): void {
        this.cleanupSubscriptions();
        this.valueChangeSubject.complete();
        this.submitEvent.complete();
        this.valid$.complete();

        // Recursively destroy all controls
        this.getAllControlsRecursive().forEach(control => {
            if (typeof control.destroy === 'function') {
                control.destroy();
            }
        });
    }

    get dirty(): boolean {
        return this.getAllControlsRecursive().some(ctrl => ctrl.dirty$.getValue());
    }

    get pristine(): boolean {
        return !this.dirty;
    }

    public updateInitialValues(newValues: Partial<T>, path: string = ''): void {
        this.initialValues = { ...this.initialValues, ...newValues };

        // Iterate through existing controls and update their values
        Object.entries(newValues).forEach(([key, value]) => {
            const controlPath = path ? `${path}.${key}` : key; // Construct full path
            const control = this.itemGetter(controlPath);

            if (control instanceof FormControl) {
                control.updateInitialValue(value); // Directly update FormControl values
            } else if (control instanceof FormGroup && typeof value === 'object') {
                this.updateInitialValues(value, controlPath); // Recursively update FormGroup
            } else if (control instanceof FormArray && Array.isArray(value)) {
                control.updateInitialValues(value);
            }
        });

        // Notify any subscribers that values have changed
        this.triggerUpdateEvent();
    }

    public onSubmitEvent(status: 'submitted' | 'failed' = 'submitted') {
        const formData = this.getFormValues() as T;
        const formErrors = this.validate() as T;
        this.submitEvent.next({
            data: formData,
            errors: formErrors,
            status: status,
        });
    }

    public onSubmitListener(): Observable<{ data: T, errors: T, status: 'submitted' | 'failed' }> {
        return this.submitEvent.asObservable();
    }

    public registerSubscription(control: FormControl<T>): void {
        this.subscriptionsMap.set(
            control.getPath(),
            control.value$.pipe(
                distinctUntilChanged((prev, curr) => prev === curr) // Only emit when value changes
            ).subscribe(() => this.valueChangeSubject.next())
        );
    }

    public triggerUpdateEvent(): void {
        this.valueChangeSubject.next()
    }

    public getSubscriptionForControl(controlName: string): Subscription | undefined {
        return this.subscriptionsMap.get(controlName);
    }

    public cleanupSubscriptionForControl(controlName: string): void {
        const subscription = this.subscriptionsMap.get(controlName);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptionsMap.delete(controlName); // Remove from the map
        }
    }

    public onControlValueChange(): void {
        if (this.validate() !== null || !this.shouldAutoSubmit) {
            return;
        }

        this.submit();
    }

    public cleanupSubscriptions(): void {
        this.subscriptionsMap.forEach(sub => sub.unsubscribe());
        this.subscriptionsMap.clear();
    }

    getPath(): string {
        return '';
    }

    getInitialValues(path?: string): any {
        if (!path) {
            return this.initialValues;
        }

        return parsePath(path)
            .reduce((acc, key) => acc && acc[key], this.initialValues);
    }

    getControlService(): ControlService<T> {
        return this.controlService;
    }

    getControl<K extends keyof T>(name: K): FormControl<T[K] | null> | FormGroup<T[K]> | FormArray<T[K]> | null {
        return this.controlService.getControl(name);
    }

    getValue(name: string): T | null {
        const control = this.getControl(name);

        if (!control || !(control instanceof FormControl)) {
            return null;
        }

        return control.getValue();
    }

    getAllControlsRecursive(): FormControl<any>[] {
        const controls: FormControl<any>[] = [];

        // Loop through the controls and collect FormControl instances
        Object.entries(this.controlService.getControls()).forEach(([key, control]) => {
            if (control instanceof FormControl) {
                // If it's a FormControl, add it to the list
                controls.push(control);
            } else if (control instanceof FormGroup || control instanceof FormArray) {
                // If it's a FormGroup or FormArray, recurse to get all controls inside it
                controls.push(...control.getControlsRecursive()); // assuming getControlsRecursive is available
            }
        });

        return controls;
    }

    validate(): ValidationErrors | null {
        const errors = ValidationService.validateForm(
            this.getAllControlsRecursive()
        );
        this.valid$.next(!errors || Object.keys(errors).length === 0);
        return errors;
    }

    getFormValues(): { [K in keyof T]: T[K] | null } {
        return this.controlService.getValues();
    }

    public itemGetter(path: string): FormControl<any> | FormArray<any> | FormGroup<any> | null {
        const segments = parsePath(path);
        let current: any = this.getControl(segments[0]);

        if (!current) {
            console.error(`${segments[0]} not found in formService.`)
        }

        for (let i = 1; i < segments.length; i++) {
            if (!current) {
                console.error(`${segments[i]} not found in formService.`)
                return null; // Stop if we hit an undefined control
            }

            if (current instanceof FormGroup) {
                current = current.getControl(segments[i]); // Go deeper
            } else if (current instanceof FormArray) {
                const index = parseInt(segments[i], 10);

                // Ensure that the next segment exists before trying to access it
                if (!isNaN(index) && segments[i + 1]) {
                    current = current.getControl(index, segments[i + 1]); // Pass index + next key
                    i++; // Skip next iteration since we consumed two segments
                } else {
                    return null; // Invalid access
                }
            } else {
                return null; // Reached a FormControl, can't go deeper
            }
        }

        return current;
    }

    async submit(): Promise<void> {
        let values = this.getFormValues() as T;

        if (this.validate()) {
            this.onSubmitEvent('failed');
            return;
        }

        if (this.transformCallback) {
            values = this.transformCallback(values);
        }

        if (this.submitCallback) {
            try {
                const response = await this.submitCallback(values);
                this.onSubmitEvent('submitted');
            } catch (error) {
                this.onSubmitEvent('failed');
            }
        } else {
            this.onSubmitEvent('submitted');
        }
    }

    unregisterControl(name: string): void {
        this.cleanupSubscriptionForControl(name);

        const segments = parsePath(name);
        if (segments.length === 0) return;

        // Traverse to the parent of the control to be removed
        let parent: any = this.controlService;
        for (let i = 0; i < segments.length - 1; i++) {
            if (!parent) return;

            if (parent instanceof FormGroup) {
                parent = parent.getControl(segments[i]);
            } else if (parent instanceof ControlService) {
                parent = parent.getControl(segments[i]);
            } else if (parent instanceof FormArray) {
                const index = parseInt(segments[i], 10);
                if (!isNaN(index) && segments[i + 1]) {
                    parent = parent.getControl(index, segments[i + 1]);
                    i++; // Skip next segment (used as name)
                } else {
                    return;
                }
            } else {
                return;
            }
        }

        const controlName = segments[segments.length - 1];
        let removeFrom: any = null;

        // Determine where to call removeControl
        if (parent instanceof FormGroup) {
            removeFrom = parent.controlService;
        } else if (parent instanceof ControlService) {
            removeFrom = parent;
        } else if (parent instanceof FormArray) {
            const index = parseInt(segments[segments.length - 2], 10);
            const group = parent.getControl(index, controlName)?.parent;
            if (group && group.controlService) {
                group.controlService.removeControl(controlName);
            }
            return;
        } else {
            return;
        }

        const control = parent instanceof FormGroup || parent instanceof ControlService
            ? parent.getControl(controlName)
            : null;

        if (!control) return;

        // Recursively unregister all nested controls if it's a group or array
        if (control instanceof FormGroup || control instanceof FormArray) {
            control.getControlsRecursive().forEach((nestedControl) => {
                if (typeof nestedControl.getPath === "function") {
                    this.unregisterControl(nestedControl.getPath());
                } else {
                    this.unregisterControl(name + "." + nestedControl.name);
                }
            });
        }

        // Remove the control from its parent
        removeFrom.removeControl(controlName);
    }
}

import { BehaviorSubject, Subject } from "rxjs";
import { getPath } from "../mixins/utilities";
import { Validators } from "../Validation/validators";
import { FormParent } from "../types/FormParent";
import type { IValidatable } from "../interfaces/IValidatable";

export class FormControl<T> implements IValidatable {
    parent?: FormParent<T>; // Add parent reference
    name: string;
    index?: number;

    value$: BehaviorSubject<T | null>;  // The current value of the control
    disabled$: BehaviorSubject<boolean>;
    visible$: BehaviorSubject<boolean>;
    required$: BehaviorSubject<boolean>;
    private initialValue: T | null;  // Store the initial value to track dirty/pristine
    private validators: Function[] = []; // Validation functions

    touched$ = new BehaviorSubject<boolean>(false);
    dirty$ = new BehaviorSubject<boolean>(false);
    pristine$ = new BehaviorSubject<boolean>(true);
    valid$ = new BehaviorSubject<boolean>(true);
    errors$ = new BehaviorSubject<string[]>([]);

    public initialValueUpdated$ = new Subject<T | null>();

    constructor(name: string, initialValue: T | null = null, isRequired: boolean = false, isDisabled: boolean = false, isVisible: boolean = true) {
        this.name = name;
        this.value$ = new BehaviorSubject(initialValue);  // Initialize with value or null
        this.disabled$ = new BehaviorSubject<boolean>(isDisabled);
        this.visible$ = new BehaviorSubject<boolean>(isVisible);
        this.required$ = new BehaviorSubject<boolean>(isRequired);
        this.initialValue = initialValue;
    }

    getPath(): string {
        return getPath(this);
    }

    setValidators(validators: Function[]): void {
        this.validators = validators;
    }

    getValidators(): Function[] {
        return this.validators;
    }

    validate(): { [key: string]: string } | null {
        let errors: { [key: string]: string } = {};

        for (const validator of this.validators) {
            const error = validator(this.value$.getValue());
            if (error) {
                errors = { ...errors, ...error };
            }
        }

        if (this.required$.getValue()) {
            const valueProvided = Validators.required(this.value$.getValue());
            if (valueProvided) {
                errors = { ...errors, ...valueProvided };
            }
        }

        const isValid = Object.keys(errors).length === 0;

        // Convert error object to an array of messages for errors$
        const errorMessages = Object.values(errors);

        this.errors$.next(errorMessages); // Update BehaviorSubject with the array of messages
        this.valid$.next(isValid);  // Update valid$ state

        return isValid ? null : errors;  // Return null if valid, or error object if invalid
    }

    setValue(newValue: T | null): void {
        this.value$.next(newValue);  // Emit new value (including null)

        if (newValue !== this.initialValue) {
            this.dirty$.next(true);
            this.pristine$.next(false);
        } else {
            this.dirty$.next(false);
            this.pristine$.next(true);
        }

        this.validate();
    }

    getValue(): T | null {
        return this.value$.getValue();  // Get the current value (including null)
    }

    getRequiredState(): boolean {
        return this.required$.getValue();
    }

    setTouched(): void {
        this.touched$.next(true);
    }

    setUntouched(): void {
        this.touched$.next(false);
    }

    setDisabled(): void {
        this.disabled$.next(true);
    }

    setEnabled(): void {
        this.disabled$.next(false);
    }

    setRequired(): void {
        this.required$.next(true);
    }

    setNotRequired(): void {
        this.required$.next(false);
    }

    setVisible(): void {
        this.visible$.next(true);
    }

    setInvisible(): void {
        this.visible$.next(false);
    }

    updateInitialValue(newInitialValue: T | null): void {
        this.initialValue = newInitialValue;
        this.reset();
        this.initialValueUpdated$.next(newInitialValue);
    }

    reset(): void {
        this.value$.next(this.initialValue);
        this.touched$.next(false);
        this.dirty$.next(false);
        this.pristine$.next(true);
        this.validate();
    }

    public destroy(): void {
        this.value$.complete();
        this.touched$.complete();
        this.dirty$.complete();
        this.pristine$.complete();
        this.valid$.complete();
        this.disabled$.complete();
        this.errors$.complete();
        this.visible$.complete();
        this.required$.complete();
    }
}

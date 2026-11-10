import { Validators } from './validators';
import type { ValidationRule } from "../types/ValidationRule";
import type { TranslationFunction } from '../types/FormOptions';
import type { IValidatable, ValidationErrors } from '../interfaces/IValidatable';

export class ValidationService {
    private static translator: TranslationFunction = (key, params) => key; // fallback
    private static translationPrefix: string | undefined;

    static setTranslator(translator: TranslationFunction) {
        this.translator = translator;
    }

    static setTranslationPrefix(prefix?: string) {
        this.translationPrefix = prefix;
    }

    static t(key: string, params?: Record<string, any>): string {
        const fullKey = this.translationPrefix ? `${this.translationPrefix}.${key}` : key;
        return this.translator(fullKey, params);
    }

    // Parse the validation string and return the corresponding validation functions
    static parseValidation(validation: ValidationRule): Function[] {

        if (!validation) {
            return [];
        }

        if (!(typeof validation === "string")) {
            return (Array.isArray(validation) ? validation : [validation])
        }

        const validationFunctions: Function[] = [];

        // Split validation rules by `|` and map to validator functions
        const rules = validation.split("|");
        rules.forEach((rule) => {
            const [validatorName, paramString] = rule.split(":");
            const validator = Validators[validatorName as keyof typeof Validators];

            // Ensure the validator is a function before adding it
            if (typeof validator === "function") {
                if (paramString) {
                    // If parameters exist, split them by commas and process them as needed
                    const params = this.parseParams(paramString);
                    validationFunctions.push((value: any) => validator(value, ...params as [any])); // Cast params to a tuple
                } else {
                    validationFunctions.push(validator);
                }
            } else {
                console.warn(`Validator "${validatorName}" is not a valid function.`);
            }
        });

        return validationFunctions;
    }

    // Helper method to parse parameters from a string
    private static parseParams(paramString: string): any[] {
        const params = paramString.split(",").map((param) => {
            const numParam = Number(param);
            return isNaN(numParam) ? param : numParam;
        });

        return params;
    }

    // Validate a single control value against its validators
    static validateControl(value: any, validators: Function[]): any {
        for (const validator of validators) {
            const error = validator(value);
            if (error) {
                return error;  // Return the first validation error
            }
        }
        return null;  // No errors
    }

    // Validate the entire form and return errors as a map of control names/paths to error messages
    static validateForm<T>(controls: { [K in keyof T]: IValidatable }): ValidationErrors | null {
        const errors: ValidationErrors = {};
        Object.keys(controls).forEach((key) => {
            const control = controls[key as keyof T];
            const error = this.validateControl(control.getValue(), control.getValidators());
            if (error) {
                errors[control.getPath()] = error;  // Store error for this control
            }
        });

        // If no errors are found, return null
        return Object.keys(errors).length > 0 ? errors : null;
    }
}

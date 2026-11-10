import { ValidationService } from '../ValidationService';

export const MinLengthValidator = (value: string, minLength: number) => {
    if (!value) {
        return null;
    }
    
    if (value.length && value.length < minLength) {
        return { minLength: ValidationService.t('form.minLength', { min: minLength }) };
    }
    
    return null;
};

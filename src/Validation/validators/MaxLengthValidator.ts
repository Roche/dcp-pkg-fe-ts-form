import { ValidationService } from '../ValidationService';

export const MaxLengthValidator = (value: string, maxLength: number) => {
    if (!value) {
        return null;
    }

    if (value.length > maxLength) {
        return { maxLength: ValidationService.t('form.maxLength', { max: maxLength }) };
    }
    
    return null;
};

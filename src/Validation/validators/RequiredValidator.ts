import { ValidationService } from '../ValidationService';

export const RequiredValidator = (value: any) => {
    if (value === null || value === undefined || value === '') {
        return { required: ValidationService.t('form.required') };
    }

    if (typeof value === 'object') {
        if (Array.isArray(value) && value.length === 0) {
            return { required: ValidationService.t('form.required') };
        } else if (Object.keys(value).length === 0) {
            return { required: ValidationService.t('form.required') };
        }
    }

    return null;
};

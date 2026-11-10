import { ValidationService } from '../ValidationService';

export const IsEmailValidator = (value: string) => {
    if (!value) {
        return null;
    }

    // Simple email regex pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
        return { email: ValidationService.t('form.email') };
    }

    return null;
};
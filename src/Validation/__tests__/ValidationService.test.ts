import { ValidationService } from '../ValidationService';
import { FormControl } from '../../components/FormControl'; // Adjust path as needed

describe('ValidationService', () => {
    beforeAll(() => {
        ValidationService.setTranslator((key: string, params?: any) => {
            if (params) {
                return `${key} ${JSON.stringify(params)}`;
            }
            return key;
        });
        ValidationService.setTranslationPrefix(undefined);
    });

    it('should translate keys with and without prefix', () => {
        expect(ValidationService.t('form.required')).toBe('form.required');
        ValidationService.setTranslationPrefix('myPrefix');
        expect(ValidationService.t('form.required')).toBe('myPrefix.form.required');
        ValidationService.setTranslationPrefix(undefined);
    });

    it('should parse validation string into validator functions', () => {
        const validators = ValidationService.parseValidation('required|minLength:3');
        expect(Array.isArray(validators)).toBe(true);
        expect(validators.length).toBe(2);
        // Should be functions
        validators.forEach(fn => expect(typeof fn).toBe('function'));
    });

    it('should validate a value using parsed validators', () => {
        const validators = ValidationService.parseValidation('required|minLength:3');
        // Should fail required
        expect(ValidationService.validateControl('', validators)).toEqual({ required: 'form.required' });
        // Should fail minLength
        expect(ValidationService.validateControl('ab', validators)).toEqual({ minLength: 'form.minLength {"min":3}' });
        // Should pass all
        expect(ValidationService.validateControl('abc', validators)).toBeNull();
    });

    it('should return errors for invalid form controls', () => {
        const controls = {
            name: new FormControl<string | null>('name', '', false),
            desc: new FormControl<string | null>('desc', 'ok', false)
        };
        controls.name.setValidators(ValidationService.parseValidation('required'));
        controls.desc.setValidators([]);
        const errors = ValidationService.validateForm(controls);
        expect(errors).toEqual({ name: { required: 'form.required' } });
    });

    it('should return null if no errors in form', () => {
        const controls = {
            name: new FormControl<string | null>('name', 'name', false),
            desc: new FormControl<string | null>('desc', 'ok', false)
        };
        controls.name.setValidators(ValidationService.parseValidation('required|minLength:2'));
        controls.desc.setValidators([]);
        const errors = ValidationService.validateForm(controls);
        expect(errors).toBeNull();
    });
});
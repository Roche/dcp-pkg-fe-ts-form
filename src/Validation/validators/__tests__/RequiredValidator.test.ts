import { RequiredValidator } from '../RequiredValidator';
import { ValidationService } from '../../ValidationService';

beforeAll(() => {
  ValidationService.setTranslator((key: string) => key);
});

describe('RequiredValidator', () => {
    it('returns error for null, undefined, or empty string', () => {
        expect(RequiredValidator(null)).toEqual({ required: 'form.required' });
        expect(RequiredValidator(undefined)).toEqual({ required: 'form.required' });
        expect(RequiredValidator('')).toEqual({ required: 'form.required' });
    });

    it('returns error for empty array', () => {
        expect(RequiredValidator([])).toEqual({ required: 'form.required' });
    });

    it('returns error for empty object', () => {
        expect(RequiredValidator({})).toEqual({ required: 'form.required' });
    });

    it('returns null for non-empty values', () => {
        expect(RequiredValidator('abc')).toBeNull();
        expect(RequiredValidator([1])).toBeNull();
        expect(RequiredValidator({ a: 1 })).toBeNull();
        expect(RequiredValidator(0)).toBeNull();
        expect(RequiredValidator(false)).toBeNull();
    });
});
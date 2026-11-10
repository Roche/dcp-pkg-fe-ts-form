import { MinLengthValidator } from '../MinLengthValidator';
import { ValidationService } from '../../ValidationService';

beforeAll(() => {
  ValidationService.setTranslator((key: string, params?: any) => `${key} ${params?.min}`);
});

describe('MinLengthValidator', () => {
    it('returns null for falsy value', () => {
        expect(MinLengthValidator('', 3)).toBeNull();
        expect(MinLengthValidator(undefined as any, 3)).toBeNull();
    });

    it('returns error if value is shorter than minLength', () => {
        expect(MinLengthValidator('ab', 3)).toEqual({ minLength: 'form.minLength 3' });
    });

    it('returns null if value meets minLength', () => {
        expect(MinLengthValidator('abc', 3)).toBeNull();
        expect(MinLengthValidator('abcd', 3)).toBeNull();
    });
});
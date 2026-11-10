import { MaxLengthValidator } from '../MaxLengthValidator';
import { ValidationService } from '../../ValidationService';

beforeAll(() => {
  ValidationService.setTranslator((key: string, params?: any) => `${key} ${params?.max}`);
});

describe('MaxLengthValidator', () => {
    it('returns null for falsy value', () => {
        expect(MaxLengthValidator('', 3)).toBeNull();
        expect(MaxLengthValidator(undefined as any, 3)).toBeNull();
    });

    it('returns error if value is longer than maxLength', () => {
        expect(MaxLengthValidator('abcd', 3)).toEqual({ maxLength: 'form.maxLength 3' });
    });

    it('returns null if value is within maxLength', () => {
        expect(MaxLengthValidator('abc', 3)).toBeNull();
        expect(MaxLengthValidator('ab', 3)).toBeNull();
    });
});
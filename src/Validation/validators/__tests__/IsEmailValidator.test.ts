import { IsEmailValidator } from '../IsEmailValidator';
import { ValidationService } from '../../ValidationService';

beforeAll(() => {
  ValidationService.setTranslator((key: string) => key);
});

describe('IsEmailValidator', () => {
    it('returns null for falsy value', () => {
        expect(IsEmailValidator('')).toBeNull();
        expect(IsEmailValidator(undefined as any)).toBeNull();
    });

    it('returns error for invalid email', () => {
        expect(IsEmailValidator('not-an-email')).toEqual({ email: 'form.email' });
        expect(IsEmailValidator('test@')).toEqual({ email: 'form.email' });
        expect(IsEmailValidator('test@com')).toEqual({ email: 'form.email' });
    });

    it('returns null for valid email', () => {
        expect(IsEmailValidator('test@example.com')).toBeNull();
        expect(IsEmailValidator('user.name+tag@domain.co')).toBeNull();
    });
});
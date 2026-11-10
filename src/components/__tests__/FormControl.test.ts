import { FormControl } from '../FormControl';

describe('FormControl', () => {
    it('should initialize with a name and value', () => {
        const control = new FormControl<string>('foo', 'bar');
        expect(control.name).toBe('foo');
        expect(control.getValue()).toBe('bar');
    });

    it('should update value', () => {
        const control = new FormControl<number>('num', 1);
        control.setValue(2);
        expect(control.getValue()).toBe(2);
    });

    it('should emit initialValueUpdated$ when initial value is updated', done => {
        const control = new FormControl<string>('foo', 'bar');
        control.initialValueUpdated$.subscribe(value => {
            expect(value).toBe('baz');
            done();
        });
        control.updateInitialValue('baz');
    });

    it('should set and get required state', () => {
        const control = new FormControl<string>('foo', 'bar');
        control.setRequired();
        expect(control.getRequiredState()).toBe(true);
        control.setNotRequired();
        expect(control.getRequiredState()).toBe(false);
    });

    it('should set touched and untouched state', () => {
        const control = new FormControl<string>('foo', 'bar');
        control.setTouched();
        expect(control.touched$.getValue()).toBe(true);
        control.setUntouched();
        expect(control.touched$.getValue()).toBe(false);
    });

    it('should set disabled and enabled state', () => {
        const control = new FormControl<string>('foo', 'bar');
        control.setDisabled();
        expect(control.disabled$.getValue()).toBe(true);
        control.setEnabled();
        expect(control.disabled$.getValue()).toBe(false);
    });

    it('should set visible and invisible state', () => {
        const control = new FormControl<string>('foo', 'bar');
        control.setInvisible();
        expect(control.visible$.getValue()).toBe(false);
        control.setVisible();
        expect(control.visible$.getValue()).toBe(true);
    });

    it('should validate required', () => {
        const control = new FormControl<string>('foo', '');
        control.setRequired();
        const errors = control.validate();
        expect(errors).toHaveProperty('required');
        expect(control.valid$.getValue()).toBe(false);
    });

    it('should reset to initial value', () => {
        const control = new FormControl<string>('foo', 'bar');
        control.setValue('baz');
        control.reset();
        expect(control.getValue()).toBe('bar');
        expect(control.dirty$.getValue()).toBe(false);
        expect(control.pristine$.getValue()).toBe(true);
    });

    it('should destroy all subjects', done => {
        const control = new FormControl<string>('foo', 'bar');
        control.destroy();

        // Subscribe after destroy; should not emit
        let emitted = false;
        control.value$.subscribe(() => {
            emitted = true;
        });

        // Try to emit a value
        control.setValue('baz');

        setTimeout(() => {
            expect(emitted).toBe(false);
            done();
        }, 50);
    });
});
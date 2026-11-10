import { FormGroup } from '../FormGroup';
import { FormControl } from '../FormControl';

describe('FormGroup', () => {
    it('should initialize with a name', () => {
        const group = new FormGroup<{ foo: string }>('myGroup');
        expect(group.name).toBe('myGroup');
    });

    it('should add and retrieve a FormControl', () => {
        const group = new FormGroup<{ foo: string }>('group');
        const control = new FormControl<string | null>('foo', 'bar');
        group.addControl(control);
        expect(group.getControl('foo')).toBe(control);
    });

    it('should get values from controls', () => {
        const group = new FormGroup<{ foo: string }>('group');
        const control = new FormControl<string | null>('foo', 'bar');
        group.addControl(control);
        expect(group.getValues()).toEqual({ foo: 'bar' });
    });

    it('should get controls recursively', () => {
        const group = new FormGroup<{ foo: string }>('group');
        const control = new FormControl<string | null>('foo', 'bar');
        group.addControl(control);
        expect(group.getControlsRecursive()).toContain(control);
    });

    it('should add and retrieve a nested FormGroup', () => {
        const parent = new FormGroup<{ child: { foo: string } }>('parent');
        const child = new FormGroup<{ foo: string }>('child');
        parent.addControl(child);
        expect(parent.getControl('child')).toBe(child);
    });

    it('should get value for a FormControl', () => {
        const group = new FormGroup<{ foo: string }>('group');
        const control = new FormControl<string | null>('foo', 'bar');
        group.addControl(control);
        expect(group.getValue('foo')).toBe('bar');
    });

    it('should return null for missing control', () => {
        const group = new FormGroup<{ foo: string }>('group');
        expect(group.getValue('missing')).toBeNull();
    });

    it('should get values from multiple controls', () => {
        const group = new FormGroup<{ foo: string | number | null, bar: string | number | null }>('group');
        group.addControl(new FormControl<string | number | null>('foo', 'baz'));
        group.addControl(new FormControl<string | number | null>('bar', 42));
        expect(group.getValues()).toEqual({ foo: 'baz', bar: 42 });
    });

    it('should return all controls', () => {
        const group = new FormGroup<{ foo: string, bar: number }>('group');
        const fooControl = new FormControl<string | number | null>('foo', 'baz');
        const barControl = new FormControl<string | number | null>('bar', 42);
        group.addControl(fooControl);
        group.addControl(barControl);
        const controls = group.getControls();
        expect(controls['foo']).toBe(fooControl);
        expect(controls['bar']).toBe(barControl);
    });
});
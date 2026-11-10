import { FormService } from '../FormService';
import { FormControl } from '../components/FormControl';
import { FormGroup } from '../components/FormGroup';
import { FormArray } from '../components/FormArray';
import { ControlService } from '../Services/ControlService';
import { Subscription } from 'rxjs';

describe('FormService', () => {
    let formService: FormService<any>;
    let subscriptions: Subscription[] = [];

    beforeEach(() => {
        formService = new FormService<any>();
        subscriptions = [];
    });

    afterEach(() => {
        // Unsubscribe all subscriptions
        subscriptions.forEach(sub => sub.unsubscribe());
        subscriptions = [];

        // Destroy all controls
        Object.values(formService.controlService.getControls()).forEach(control => {
            if ('destroy' in control && typeof control.destroy === 'function') {
                control.destroy();
            }
        });
    });

    it('should add and retrieve controls via controlService', () => {
        const nameControl = new FormControl('name', 'Alice');
        const ageControl = new FormControl('age', 30);

        formService.controlService.addControl(nameControl);
        formService.controlService.addControl(ageControl);

        expect(formService.getControl('name')).toBe(nameControl);
        expect(formService.getControl('age')).toBe(ageControl);
    });

    it('should get and update initial values', () => {
        formService = new FormService<Record<string, any>>({ name: 'Bob', age: 25, group: { city: 'Paris' }, items: [] });
        expect(formService.getInitialValues()).toEqual({ name: 'Bob', age: 25, group: { city: 'Paris' }, items: [] });

        formService.controlService.addControl(new FormControl('name', null));
        formService.controlService.addControl(new FormControl('age', null));
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Paris'));
        formService.controlService.addControl(group);
        const arr = new FormArray('items', formService, new ControlService());
        formService.controlService.addControl(arr);

        formService.updateInitialValues({ name: 'Charlie', age: 40 });
        expect(formService.getInitialValues()).toEqual({ name: 'Charlie', age: 40, group: { city: 'Paris' }, items: [] });
    });

    it('should get all controls recursively', () => {
        const nameControl = new FormControl('name', 'Alice');
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Berlin'));

        formService.controlService.addControl(nameControl);
        formService.controlService.addControl(group);

        const allControls = formService.getAllControlsRecursive();
        expect(allControls).toContain(nameControl);
        expect(allControls.some(ctrl => ctrl.name === 'city')).toBe(true);
    });

    it('should get form values', () => {
        const nameControl = new FormControl('name', 'Alice');
        const ageControl = new FormControl('age', 30);
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Berlin'));

        const arr = new FormArray('items', formService, new ControlService());
        arr.addControl(new FormControl('value', 42) as any);

        formService.controlService.addControl(nameControl);
        formService.controlService.addControl(ageControl);
        formService.controlService.addControl(group);
        formService.controlService.addControl(arr);

        expect(formService.getFormValues()).toEqual({
            name: 'Alice',
            age: 30,
            group: { city: 'Berlin' },
            items: [{ value: 42 }]
        });
    });

    it('should unregister a control', () => {
        const nameControl = new FormControl('name', 'Alice');
        formService.controlService.addControl(nameControl);
        expect(formService.getControl('name')).toBe(nameControl);

        formService.unregisterControl('name');
        expect(formService.getControl('name')).toBeNull();
    });

    it('should emit submit event with correct status', done => {
        const nameControl = new FormControl('name', 'Alice');
        formService.controlService.addControl(nameControl);

        const sub = formService.onSubmitListener().subscribe(event => {
            expect(event.status).toBe('submitted');
            expect(event.data.name).toBe('Alice');
            done();
        });
        subscriptions.push(sub);

        formService.onSubmitEvent('submitted');
    });

    it('should get and set values using itemGetter and FormControl API', () => {
        const nameControl = new FormControl('name', 'Alice');
        formService.controlService.addControl(nameControl);

        // Get value directly from FormService
        expect((formService.itemGetter('name') as FormControl<string | null>)?.getValue()).toBe('Alice');

        // Set value directly
        nameControl.setValue('Bob');
        expect((formService.itemGetter('name') as FormControl<string | null>)?.getValue()).toBe('Bob');
    });

    it('should get nested group and array values using itemGetter', () => {
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Berlin'));
        formService.controlService.addControl(group);

        const arr = new FormArray('items', formService, new ControlService());
        arr.addControl(new FormControl('value', 42));
        formService.controlService.addControl(arr);

        // Get nested values
        expect((formService.itemGetter('group.city') as FormControl<string | null>)?.getValue()).toBe('Berlin');
        expect((formService.itemGetter('items.0.value') as FormControl<number | null>)?.getValue()).toBe(42);
    });

    it('should track value changes via valueChangeSubject', done => {
        const control = new FormControl('name', 'Alice');
        formService.controlService.addControl(control);
        formService.registerSubscription(control);

        let callCount = 0;
        const sub = formService.valueChangeSubject.subscribe(() => {
            callCount++;
            if (callCount === 2) { // The first call is the initial emission
                sub.unsubscribe();
                done();
            }
        });
        subscriptions.push(sub);

        control.setValue('Charlie');
    });

    it('should report invalid state when a control is invalid', () => {
        const control = new FormControl('name', null);
        formService.controlService.addControl(control, 'required');

        const errors = formService.validate();
        expect(errors).toHaveProperty('name');
        expect(errors?.name).toHaveProperty('required');
        expect(formService.valid$.getValue()).toBe(false);
    });

    it('should update dirty$ and pristine$ when a control value changes', () => {
        const control = new FormControl('name', 'Alice');
        formService.controlService.addControl(control);

        expect(formService.dirty).toBe(false);
        expect(formService.pristine).toBe(true);

        control.setValue('Bob');

        expect(formService.dirty).toBe(true);
        expect(formService.pristine).toBe(false);
    });

    it('should correctly aggregate dirty/pristine state for controls, groups, and arrays', () => {
        // Create a control
        const nameControl = new FormControl('name', 'Alice');
        formService.controlService.addControl(nameControl);

        // Create a group with a control
        const group = new FormGroup('group');
        const cityControl = new FormControl('city', 'Berlin');
        group.addControl(cityControl);
        formService.controlService.addControl(group);

        // Create an array with a group item
        const arr = new FormArray('items', formService, new ControlService());
        const itemGroup = new FormGroup('item');
        const valueControl = new FormControl('value', 42);
        itemGroup.addControl(valueControl);
        arr.addControl(itemGroup);
        formService.controlService.addControl(arr);

        // Initially, everything should be pristine
        expect(nameControl.dirty$.getValue()).toBe(false);
        expect(cityControl.dirty$.getValue()).toBe(false);
        expect(valueControl.dirty$.getValue()).toBe(false);
        expect(group.dirty).toBe(false);
        expect(arr.dirty).toBe(false);
        expect(formService.dirty).toBe(false);
        expect(formService.pristine).toBe(true);

        // Change the value of the control in the group
        cityControl.setValue('Hamburg');
        expect(cityControl.dirty$.getValue()).toBe(true);
        expect(group.dirty).toBe(true);
        expect(arr.dirty).toBe(false);
        expect(formService.dirty).toBe(true);
        expect(formService.pristine).toBe(false);

        // Reset cityControl to its initial value
        cityControl.setValue('Berlin');
        expect(cityControl.dirty$.getValue()).toBe(false);
        expect(group.dirty).toBe(false);
        expect(formService.dirty).toBe(false);
        expect(formService.pristine).toBe(true);

        // Change the value of the control in the array
        valueControl.setValue(99);
        expect(valueControl.dirty$.getValue()).toBe(true);
        expect(arr.dirty).toBe(true);
        expect(formService.dirty).toBe(true);

        // Change the value of the top-level control
        nameControl.setValue('Bob');
        expect(nameControl.dirty$.getValue()).toBe(true);
        expect(formService.dirty).toBe(true);

        // Reset all controls to their initial values
        valueControl.setValue(42);
        nameControl.setValue('Alice');
        expect(valueControl.dirty$.getValue()).toBe(false);
        expect(nameControl.dirty$.getValue()).toBe(false);
        expect(arr.dirty).toBe(false);
        expect(formService.dirty).toBe(false);
        expect(formService.pristine).toBe(true);
    });
});
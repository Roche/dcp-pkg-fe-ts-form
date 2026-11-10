import { FormArray } from '../FormArray';
import { FormControl } from '../FormControl';
import { FormGroup } from '../FormGroup';
import { FormService } from '../../FormService';
import { ControlService } from '../../Services/ControlService';

describe('FormArray', () => {
    function createFormArray() {
        const formService = new FormService<any>();
        const controlService = new ControlService<any>();
        const arr = new FormArray<number>('testArray', formService, controlService);
        // Register the array with the FormService
        formService.controlService.addControl(arr);
        return arr;
    }

    it('should initialize empty', () => {
        const arr = createFormArray();
        expect(arr.getControls().length).toBe(0);
    });

    it('should add controls', () => {
        const arr = createFormArray();
        const control = new FormControl<number | null>('num', 1);
        arr.addControl(control);
        const controls = arr.getControls();
        const found = controls.find(obj => Object.values(obj).includes(control));
        expect(found).toBeDefined();
    });

    it('should clear controls', () => {
        const arr = createFormArray();
        arr.addControl(new FormControl<number | null>('num', 1));
        expect(arr.getControls().length).toBe(1);
        arr.clearControls();
        expect(arr.getControls().length).toBe(0);
    });

    it('should return correct values for added controls', () => {
        const arr = createFormArray();
        arr.addControl(new FormControl<number | null>('num', 1), undefined, 0);
        arr.addControl(new FormControl<number | null>('num2', 2), undefined, 1);
        expect(arr.getValues()).toEqual([{ num: 1 }, { num2: 2 }]);
    });

    it('should remove an item by index', () => {
        const arr = createFormArray();

        // Step 1: Add items (data rows) to the array FIRST
        arr.addItem({ num: 1 });
        arr.addItem({ num: 2 });

        // Step 2: Simulate component registration for each data row
        const data = arr.getItems();
        data.forEach((item, idx) => {
            arr.addControl(new FormControl<number | null>('num', item.num), undefined, idx);
        });

        // Verify initial state
        expect(arr.getValues()).toEqual([{ num: 1 }, { num: 2 }]);
        expect(arr.getItems()).toEqual([{ num: 1 }, { num: 2 }]);

        // Remove the first item
        arr.removeItem(0);

        expect(arr.getValues()).toEqual([{ num: 2 }]);
        expect(arr.getItems()).toEqual([{ num: 2 }]);
    });

    it('should get controls recursively', () => {
        const arr = createFormArray();
        const control = new FormControl<number | null>('num', 1);
        arr.addControl(control);
        expect(arr.getControlsRecursive()).toContain(control);
    });

    it('should support nested FormGroup with controls as array items', () => {
        type Person = { firstName: string | null; lastName: string | null };
        const formService = new FormService<any>();
        const controlService = new ControlService<any>();
        const arr = new FormArray<Person>('testArray', formService, controlService);
        // Register with FormService
        formService.controlService.addControl(arr);

        // Add items (data rows) to the array (simulating user action)
        arr.addItem({ person: { firstName: 'Alice', lastName: 'Smith' } });
        arr.addItem({ person: { firstName: 'Bob', lastName: 'Brown' } });
        arr.addItem({ person: { firstName: 'Carol', lastName: 'White' } });

        // For each data row, simulate Vue rendering and registration of a FormGroup
        const data = arr.getItems();
        data.forEach((item, idx) => {
            const group = new FormGroup<Person>('person');
            group.addControl(new FormControl<string | null>('firstName', item.person.firstName));
            group.addControl(new FormControl<string | null>('lastName', item.person.lastName));
            arr.addControl(group, undefined, idx);
        });

        // getItems should reflect the nested structure, including added items
        expect(arr.getItems()).toEqual([
            {
                person: {
                    firstName: 'Alice',
                    lastName: 'Smith'
                }
            },
            {
                person: {
                    firstName: 'Bob',
                    lastName: 'Brown'
                }
            },
            {
                person: {
                    firstName: 'Carol',
                    lastName: 'White'
                }
            }
        ]);

        // getValues should reflect the values of all controls
        expect(arr.getValues()).toEqual([
            {
                person: {
                    firstName: 'Alice',
                    lastName: 'Smith'
                }
            },
            {
                person: {
                    firstName: 'Bob',
                    lastName: 'Brown'
                }
            },
            {
                person: {
                    firstName: 'Carol',
                    lastName: 'White'
                }
            }
        ]);

        // getControlsRecursive should include all controls from all groups
        const controls = arr.getControlsRecursive();
        expect(controls.some(ctrl => ctrl.name === 'firstName')).toBe(true);
        expect(controls.some(ctrl => ctrl.name === 'lastName')).toBe(true);
    });
});
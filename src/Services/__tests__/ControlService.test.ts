import { ControlService } from '../ControlService';
import { FormControl } from '../../components/FormControl';
import { FormGroup } from '../../components/FormGroup';
import { FormArray } from '../../components/FormArray';
import { FormService } from '../../FormService';
import { logger } from '@open-dcp/utilities';

// Mock the logger
jest.mock('@open-dcp/utilities', () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('ControlService', () => {
    let service: ControlService<any>;

    beforeEach(() => {
        service = new ControlService<any>();
    });

    it('should add and retrieve a FormControl', () => {
        const control = new FormControl('name', 'Alice');
        service.addControl(control);
        expect(service.getControl('name')).toBe(control);
        expect(service.getControls()['name']).toBe(control);
    });

    it('should not add duplicate controls', () => {
        const control1 = new FormControl('name', 'Alice');
        const control2 = new FormControl('name', 'Bob');
        service.addControl(control1);
        const result = service.addControl(control2);
        expect(result).toBe(control1);
        expect(service.getControl('name')).toBe(control1);
        expect(logger.warn).toHaveBeenCalledWith('Control with name "name" was already registered.');
    });

    it('should add and retrieve a FormGroup', () => {
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Berlin'));
        service.addControl(group);
        expect(service.getControl('group')).toBe(group);
        expect(service.getControls()['group']).toBe(group);
    });

    it('should add and retrieve a FormArray', () => {
        const formService = new FormService();
        const arr = new FormArray('items', formService, new ControlService());
        service.addControl(arr);
        expect(service.getControl('items')).toBe(arr);
        expect(service.getControls()['items']).toBe(arr);
    });

    it('should remove a control', () => {
        const control = new FormControl('name', 'Alice');
        service.addControl(control);
        service.removeControl('name');
        expect(service.getControl('name')).toBeNull();
    });

    it('should get values from all controls', () => {
        const nameControl = new FormControl('name', 'Alice');
        const ageControl = new FormControl('age', 30);
        const group = new FormGroup('group');
        group.addControl(new FormControl('city', 'Berlin'));

        const formService = new FormService();
        const arr = new FormArray('items', formService, new ControlService());
        arr.addControl(new FormControl('value', 42) as any);
        arr.addControl(new FormControl('value', 43) as any, undefined, 1);

        service.addControl(nameControl);
        service.addControl(ageControl);
        service.addControl(group);
        service.addControl(arr);

        expect(service.getValues()).toEqual({
            name: 'Alice',
            age: 30,
            group: { city: 'Berlin' },
            items: [
                { value: 42 },
                { value: 43 }
            ]
        });
    });

    it('should respect disabled controls in getValues', () => {
        const nameControl = new FormControl('name', 'Alice');
        nameControl.disabled$.next(true);
        service.addControl(nameControl);
        expect(service.getValues()).toEqual({});
    });

    it('should compute correct path', () => {
        expect(service.getPath('foo')).toBe('foo');
        expect(service.getPath('bar', 2)).toBe('2.bar');
    });
});
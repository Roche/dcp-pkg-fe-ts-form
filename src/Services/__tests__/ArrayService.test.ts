import { FormArray } from '../../components/FormArray';
import { FormGroup } from '../../components/FormGroup';
import { FormControl } from '../../components/FormControl';
import { FormService } from '../../FormService';
import { ControlService } from '../ControlService';

describe('ArrayService', () => {
    type Person = { firstName: string | null; lastName: string | null };
    let createdControls: (FormControl<any> | FormGroup<any> | FormArray<any>)[] = [];

    function createArrayService(defaults?: Record<string, any>) {
        const formService = new FormService<any>();
        const controlService = new ControlService<any>();

        // Create a real FormArray and register it
        const parent = new FormArray<Person>('people', formService, controlService, defaults);
        formService.controlService.addControl(parent);
        createdControls.push(parent);

        return { service: parent.arrayService, formService, parent };
    }

    afterEach(() => {
        // Destroy all created controls
        createdControls.forEach(control => {
            if ('destroy' in control && typeof control.destroy === 'function') {
                control.destroy();
            }
        });
        createdControls = [];
    });

    it('initializes with empty items and renderedItems', () => {
        const { service } = createArrayService();
        expect(service.getItems()).toEqual([]);
        expect(service.getRenderedItems()).toEqual([]);
    });

    describe('nested array initialization', () => {
        type Filter = { column: string; value: string };
        type Trace = { datasetFilters?: Filter[]; data?: { datasetFilters: Filter[] } };
        const filters: Filter[] = [{ column: 'status', value: 'active' }];
        const forms: FormService<any>[] = [];

        function createTraces(initialTraces: Trace[] = []) {
            const form = new FormService<any>({ traces: initialTraces });
            forms.push(form);
            const traces = new FormArray<Trace>('traces', form, form.controlService);
            form.controlService.addControl(traces);
            createdControls.push(traces);
            return { form, traces };
        }

        function registerRow(traces: FormArray<Trace>, index: number, name: string | null = null) {
            const row = new FormGroup<any>(name);
            traces.addControl(row, undefined, index);
            return row;
        }

        function createFilters(form: FormService<any>, group: FormGroup<any>) {
            const array = new FormArray<Filter>('datasetFilters', form, group.controlService);
            group.addControl(array);
            createdControls.push(array);
            return array;
        }

        afterEach(() => {
            forms.forEach(form => form.destroy());
            forms.length = 0;
        });

        it('preserves filters when copying a trace to a new index', () => {
            const { form, traces } = createTraces([{ datasetFilters: filters }]);
            traces.addItem(JSON.parse(JSON.stringify(traces.getItems()[0])));
            const array = createFilters(form, registerRow(traces, 1));

            expect(array.getItems()).toEqual(filters);
            const filterRow = new FormGroup<Filter>();
            array.addControl(filterRow, undefined, 0);
            filterRow.addControl(new FormControl<string | null>('column', filters[0].column));
            filterRow.addControl(new FormControl<string | null>('value', filters[0].value));
            expect(array.getValues()).toEqual(filters);
        });

        it('initializes nested arrays in dynamically added items', () => {
            const { form, traces } = createTraces();
            traces.addItem({ datasetFilters: filters });
            expect(createFilters(form, registerRow(traces, 0)).getItems()).toEqual(filters);
        });

        it('resolves intermediate named and unnamed groups', () => {
            const { form, traces } = createTraces();
            traces.addItem({ data: { datasetFilters: filters } });
            const row = registerRow(traces, 0);
            const data = new FormGroup<any>('data');
            const unnamed = new FormGroup<any>();
            row.addControl(data);
            data.addControl(unnamed);
            expect(createFilters(form, unnamed).getItems()).toEqual(filters);
        });

        it('includes the name of a named array item group', () => {
            const { form, traces } = createTraces();
            traces.addItem({ data: { datasetFilters: filters } });
            expect(createFilters(form, registerRow(traces, 0, 'data')).getItems()).toEqual(filters);
        });

        it('does not replace explicitly empty filters with original values', () => {
            const { form, traces } = createTraces([{ datasetFilters: filters }]);
            traces.updateInitialValues([{ datasetFilters: [] }]);
            expect(createFilters(form, registerRow(traces, 0)).getItems()).toEqual([]);
        });

        it('still loads nested arrays from original form values', () => {
            const { form, traces } = createTraces([{ datasetFilters: filters }]);
            expect(createFilters(form, registerRow(traces, 0)).getItems()).toEqual(filters);
        });

        it('falls back to original values when the rendered value is undefined', () => {
            const { form, traces } = createTraces([{ datasetFilters: filters }]);
            traces.updateInitialValues([{}]);
            expect(createFilters(form, registerRow(traces, 0)).getItems()).toEqual(filters);
        });

        it('uses the current item after reordering rather than its original index', () => {
            const otherFilters = [{ column: 'status', value: 'inactive' }];
            const { form, traces } = createTraces([
                { datasetFilters: filters }, { datasetFilters: otherFilters }
            ]);
            registerRow(traces, 0);
            const movedRow = registerRow(traces, 1);
            traces.arrayService.reorder(1, 0);
            expect(createFilters(form, movedRow).getItems()).toEqual(otherFilters);
        });

        it('uses the current item after removing an earlier row', () => {
            const otherFilters = [{ column: 'status', value: 'inactive' }];
            const { form, traces } = createTraces([
                { datasetFilters: filters }, { datasetFilters: otherFilters }
            ]);
            registerRow(traces, 0);
            const remainingRow = registerRow(traces, 1);
            traces.removeItem(0);
            expect(createFilters(form, remainingRow).getItems()).toEqual(otherFilters);
        });

        it('resolves arrays through multiple levels of containing arrays', () => {
            const { form, traces } = createTraces();
            traces.addItem({ datasetFilters: [{ children: filters }] });
            const outerFilters = createFilters(form, registerRow(traces, 0));
            const row = new FormGroup<any>();
            outerFilters.addControl(row, undefined, 0);
            const children = new FormArray<Filter>('children', form, row.controlService);
            row.addControl(children);
            createdControls.push(children);
            expect(children.getItems()).toEqual(filters);
        });
    });

    it('addItem adds a data row only', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'Alice', lastName: 'Smith' } });
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getItems().length).toBe(0);
    });

    it('addItem adds a data row and updates renderedItems', () => {
        const { service } = createArrayService();
        const newItem = { person: { firstName: 'Alice', lastName: 'Smith' } };

        service.addItem(newItem);

        // Check that rendered items are updated
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getRenderedItems()[0]).toEqual(newItem);
    });

    it('addItem with defaults uses default values', () => {
        const defaults = { person: { firstName: 'Default', lastName: 'Person' } };
        const { service } = createArrayService(defaults);

        service.addItem();

        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getRenderedItems()[0]).toEqual(defaults);
    });

    it('addItem multiple times updates renderedItems correctly', () => {
        const { service } = createArrayService();
        const item1 = { person: { firstName: 'Alice', lastName: 'Smith' } };
        const item2 = { person: { firstName: 'Bob', lastName: 'Jones' } };

        service.addItem(item1);
        service.addItem(item2);

        expect(service.getRenderedItems().length).toBe(2);
        expect(service.getRenderedItems()[0]).toEqual(item1);
        expect(service.getRenderedItems()[1]).toEqual(item2);
    });

    it('removeItem removes a data row and updates renderedItems', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'A', lastName: 'B' } });
        service.addItem({ person: { firstName: 'C', lastName: 'D' } });

        // Need to add controls for removeItem to work properly
        const data = service.getRenderedItems();
        data.forEach((item, idx) => {
            const group = new FormGroup<Person>('person');
            const firstName = new FormControl('firstName', item.person.firstName);
            const lastName = new FormControl('lastName', item.person.lastName);
            group.addControl(firstName);
            group.addControl(lastName);
            service.addControl(group, undefined, idx);
            createdControls.push(group, firstName, lastName);
        });

        service.removeItem(0);
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getRenderedItems()[0].person.firstName).toBe('C');
    });

    it('addControl adds a control only', () => {
        const { service } = createArrayService();
        const group = new FormGroup<Person>('person');
        group.addControl(new FormControl<string | null>('firstName', 'Alice'));
        group.addControl(new FormControl<string | null>('lastName', 'Smith'));
        service.addControl(group, undefined, 0);
        expect(service.getItems().length).toBe(1);
        expect(service.getRenderedItems().length).toBe(0);
    });

    it('removeItem removes a data row only', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'A', lastName: 'B' } });
        service.addItem({ person: { firstName: 'C', lastName: 'D' } });

        // Add controls so removeItem doesn't early return
        const data = service.getRenderedItems();
        data.forEach((item, idx) => {
            const group = new FormGroup<Person>('person');
            group.addControl(new FormControl('firstName', item.person.firstName));
            group.addControl(new FormControl('lastName', item.person.lastName));
            service.addControl(group, undefined, idx);
        });

        service.removeItem(0);
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getRenderedItems()[0].person.firstName).toBe('C');
    });

    it('clearControls removes all controls', () => {
        const { service } = createArrayService();
        const group = new FormGroup<Person>('person');
        group.addControl(new FormControl<string | null>('firstName', 'Alice'));
        group.addControl(new FormControl<string | null>('lastName', 'Smith'));
        service.addControl(group, undefined, 0);
        expect(service.getItems().length).toBe(1);
        service.clearControls();
        expect(service.getItems().length).toBe(0);
    });

    it('reorder swaps data rows', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'A', lastName: 'B' } });
        service.addItem({ person: { firstName: 'C', lastName: 'D' } });
        service.reorder(0, 1);
        expect(service.getRenderedItems()[0].person.firstName).toBe('C');
        expect(service.getRenderedItems()[1].person.firstName).toBe('A');
    });

    it('addItem and addControl are independent', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'X', lastName: 'Y' } });
        expect(service.getItems().length).toBe(0);
        const group = new FormGroup<Person>('person');
        group.addControl(new FormControl<string | null>('firstName', 'Z'));
        group.addControl(new FormControl<string | null>('lastName', 'W'));
        service.addControl(group, undefined, 0);
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getItems().length).toBe(1);
    });

    it('keeps controls and data in sync if used with correct indices', () => {
        const { service } = createArrayService();
        service.addItem({ person: { firstName: 'A', lastName: 'B' } });
        service.addItem({ person: { firstName: 'C', lastName: 'D' } });

        // Register controls at correct indices
        const data = service.getRenderedItems();
        data.forEach((item, idx) => {
            const group = new FormGroup<Person>('person');
            group.addControl(new FormControl('firstName', item.person.firstName));
            group.addControl(new FormControl('lastName', item.person.lastName));
            service.addControl(group, undefined, idx);
        });

        expect(service.getItems().length).toBe(2);
        expect(service.getRenderedItems().length).toBe(2);

        // Remove first item and check sync
        service.removeItem(0);
        expect(service.getRenderedItems().length).toBe(1);
        expect(service.getItems().length).toBe(1);
        expect(service.getRenderedItems()[0].person.firstName).toBe('C');
    });
});
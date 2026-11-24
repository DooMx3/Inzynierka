import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import TasksPanel from './tasksPanel.svelte';
import { DEFAULT_TASK_TYPE_OPTIONS, type TaskItem } from '$lib/api/tasks';
import { setUser } from '$lib/stores/session.svelte';

const ownerUser = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@vineyard.pl',
    roles: ['OWNER'],
};

const workerUser = {
    id: 'worker-1',
    firstname: 'Piotr',
    lastname: 'Zieliński',
    email: 'piotr@vineyard.pl',
    roles: ['WORKER'],
};

const oenologistUser = {
    id: 'oeno-1',
    firstname: 'Marek',
    lastname: 'Wiśniewski',
    email: 'marek@vineyard.pl',
    roles: ['OENOLOGIST'],
};

const sampleFields = [
    {
        id: 'field-1',
        areaAre: 45,
        grapeVariety: 'SOLARIS',
        grapeVarietyName: 'Solaris',
        grapeColor: 'WHITE',
        active: true,
    },
];

const sampleEquipment = [
    {
        id: 'eq-1',
        name: 'Sprayer #1',
        type: 'Sprayer',
        endOfTechnicalInspection: '2028-06-01',
        active: true,
    },
];

const sampleSubstances = [{ id: 'sub-1', name: 'Copper Sulfate', active: true }];

const sampleMembers = [
    {
        id: 'owner-1',
        firstname: 'Anna',
        lastname: 'Nowak',
        email: 'anna@vineyard.pl',
        phoneNumber: null,
        membershipStatus: 'ACTIVE',
        roles: ['OWNER'],
    },
    {
        id: 'worker-1',
        firstname: 'Piotr',
        lastname: 'Zieliński',
        email: 'piotr@vineyard.pl',
        phoneNumber: null,
        membershipStatus: 'ACTIVE',
        roles: ['WORKER'],
    },
];

const makeBaseTasks = (): TaskItem[] => [
    {
        id: 'task-1',
        type: 'SPRAYING',
        name: 'Morning mildew treatment',
        description: 'Apply 2kg/ha before noon wind picks up.',
        createdById: 'owner-1',
        creatorRoleAtCreation: 'OWNER',
        assignedUserId: 'worker-1',
        fieldId: 'field-1',
        equipmentId: 'eq-1',
        substanceId: 'sub-1',
        batchId: null,
        bottlingId: null,
        recordId: null,
        startedAt: '2026-05-01',
        completedAt: null,
        dueDate: '2020-05-02',
        completed: false,
    },
    {
        id: 'task-2',
        type: 'EQUIPMENT_MAINTENANCE',
        name: 'Calibrate nozzle pressure',
        description: '',
        createdById: 'worker-1',
        creatorRoleAtCreation: 'WORKER',
        assignedUserId: 'worker-1',
        fieldId: null,
        equipmentId: 'eq-1',
        substanceId: null,
        batchId: null,
        bottlingId: null,
        recordId: null,
        startedAt: '2026-05-03',
        completedAt: '2026-05-04',
        dueDate: '2026-05-05',
        completed: true,
    },
];

const buildFetchMock = (
    tasksRef: { current: TaskItem[] },
    overrides?: Partial<Record<string, (url: string, init?: RequestInit) => Response | Promise<Response>>>,
) =>
    (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (overrides?.[`${method} ${url}`]) {
            return overrides[`${method} ${url}`]!(url, init);
        }

        if (url === '/api/tasks' && method === 'GET') {
            return new Response(JSON.stringify(tasksRef.current), { status: 200 });
        }
        if (url === '/api/tasks' && method === 'POST') {
            const body = JSON.parse(String(init?.body ?? '{}'));
            const created: TaskItem = {
                id: `task-created-${tasksRef.current.length + 1}`,
                type: body.type ?? 'GENERAL',
                name: body.name ?? '',
                description: body.description ?? '',
                createdById: 'owner-1',
                creatorRoleAtCreation: 'OWNER',
                assignedUserId: body.assignedUserId ?? 'owner-1',
                fieldId: body.fieldId ?? null,
                equipmentId: body.equipmentId ?? null,
                substanceId: body.substanceId ?? null,
                batchId: body.batchId ?? null,
                bottlingId: body.bottlingId ?? null,
                recordId: body.recordId ?? null,
                startedAt: body.startedAt ?? null,
                completedAt: null,
                dueDate: body.dueDate ?? null,
                completed: false,
            };
            tasksRef.current = [created, ...tasksRef.current];
            return new Response(JSON.stringify(created), { status: 201 });
        }
        if (url.endsWith('/complete') && method === 'PATCH') {
            const id = url.split('/')[3]!;
            const existing = tasksRef.current.find((t) => t.id === id)!;
            const updated: TaskItem = {
                ...existing,
                completed: true,
                completedAt: '2026-11-23',
            };
            tasksRef.current = tasksRef.current.map((t) => (t.id === id ? updated : t));
            return new Response(JSON.stringify(updated), { status: 200 });
        }
        if (url.endsWith('/reopen') && method === 'PATCH') {
            const id = url.split('/')[3]!;
            const existing = tasksRef.current.find((t) => t.id === id)!;
            const updated: TaskItem = {
                ...existing,
                completed: false,
                completedAt: null,
            };
            tasksRef.current = tasksRef.current.map((t) => (t.id === id ? updated : t));
            return new Response(JSON.stringify(updated), { status: 200 });
        }
        if (url.startsWith('/api/tasks/') && method === 'DELETE') {
            const id = url.split('/')[3]!;
            tasksRef.current = tasksRef.current.filter((t) => t.id !== id);
            return new Response(null, { status: 204 });
        }
        if (url === '/api/task-types') {
            return new Response(JSON.stringify(DEFAULT_TASK_TYPE_OPTIONS), { status: 200 });
        }
        if (url === '/api/fields') {
            return new Response(JSON.stringify(sampleFields), { status: 200 });
        }
        if (url === '/api/equipment') {
            return new Response(JSON.stringify(sampleEquipment), { status: 200 });
        }
        if (url === '/api/substances') {
            return new Response(JSON.stringify(sampleSubstances), { status: 200 });
        }
        if (url === '/api/organisations/members') {
            return new Response(JSON.stringify(sampleMembers), { status: 200 });
        }
        return new Response('[]', { status: 200 });
    }) as unknown as typeof fetch;

describe('TasksPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        window.location.href = 'http://localhost/tasks';
        localStorage.clear();
        setUser(ownerUser);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    it('lists tasks, highlights overdue tasks with Due badge, and handles 403 lookups gracefully', async () => {
        setUser(oenologistUser);
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef, {
            'GET /api/fields': () =>
                new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
            'GET /api/organisations/members': () =>
                new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        });

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        });
        expect(screen.getByText('Calibrate nozzle pressure')).toBeInTheDocument();
        expect(screen.getByText('Due')).toBeInTheDocument();

        const overdueRow = screen.getByText('Morning mildew treatment').closest('tr');
        expect(overdueRow).toHaveAttribute('data-highlighted', 'true');
    });

    it('filters tasks by Planned and Completed', async () => {
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef);

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
            expect(screen.getByText('Calibrate nozzle pressure')).toBeInTheDocument();
        });

        // Open Filter dropdown (currently showing "All tasks") and select "Planned (to do)"
        const filterBtn = screen.getByRole('button', { name: 'All tasks' });
        await fireEvent.click(filterBtn);
        await fireEvent.click(screen.getByRole('option', { name: 'Planned (to do)' }));

        expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        expect(screen.queryByText('Calibrate nozzle pressure')).not.toBeInTheDocument();

        // Switch Filter to "Completed"
        await fireEvent.click(screen.getByRole('button', { name: /Planned \(to do\)/i }));
        await fireEvent.click(screen.getByRole('option', { name: 'Completed' }));

        expect(screen.queryByText('Morning mildew treatment')).not.toBeInTheDocument();
        expect(screen.getByText('Calibrate nozzle pressure')).toBeInTheDocument();
    });

    it('expands task description and linked relation details on row click', async () => {
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef);

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        });

        expect(
            screen.queryByText('Apply 2kg/ha before noon wind picks up.'),
        ).not.toBeInTheDocument();

        // Click the row cell itself (expandOnRowClick=true)
        await fireEvent.click(screen.getByText('Morning mildew treatment'));

        expect(screen.getByText('Apply 2kg/ha before noon wind picks up.')).toBeInTheDocument();
        expect(screen.getByText('Solaris (White, 45 ar)')).toBeInTheDocument();
        expect(screen.getByText('Copper Sulfate')).toBeInTheDocument();
        expect(screen.getByText('Piotr Zieliński (piotr@vineyard.pl)')).toBeInTheDocument();

        // Clicking the second row shows "No description provided." fallback
        await fireEvent.click(screen.getByText('Calibrate nozzle pressure'));
        expect(screen.getByText('No description provided.')).toBeInTheDocument();
    });

    it('marks a planned task completed and reopens a completed task', async () => {
        setUser(workerUser);
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef);

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        });

        const row1 = screen.getByText('Morning mildew treatment').closest('tr')!;
        const completeBtn = within(row1).getByRole('button', { name: 'Complete' });
        await fireEvent.click(completeBtn);

        await waitFor(() => {
            const updatedRow1 = screen.getByText('Morning mildew treatment').closest('tr')!;
            expect(within(updatedRow1).getByText('Completed')).toBeInTheDocument();
            expect(within(updatedRow1).getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
        });

        // Reopen the task
        const updatedRow1 = screen.getByText('Morning mildew treatment').closest('tr')!;
        await fireEvent.click(within(updatedRow1).getByRole('button', { name: 'Reopen' }));

        await waitFor(() => {
            const reopenedRow1 = screen.getByText('Morning mildew treatment').closest('tr')!;
            expect(within(reopenedRow1).getByText('Planned')).toBeInTheDocument();
        });
    });

    it('creates a task with dynamic TaskTypeOption required fields (SPRAYING requiring field and substance)', async () => {
        localStorage.setItem(
            'wms_production_batches_v1',
            JSON.stringify([
                {
                    id: 'batch-1',
                    batchNumber: 'BATCH-1001',
                    name: 'Solaris 2026',
                    stage: 'FERMENTING',
                    quantity: 500,
                    equipmentId: 'eq-1',
                    equipmentLabel: 'Fermentor #1',
                    createdAt: '2026-09-01T00:00:00.000Z',
                    isSpoiled: false,
                    yeastId: 'EC1118',
                    description: '',
                    sources: [],
                    ingredients: [],
                    nutrientsOverride: null,
                },
            ]),
        );

        const tasksRef = { current: makeBaseTasks() };
        let capturedPostBody: Record<string, unknown> | null = null;

        globalThis.fetch = buildFetchMock(tasksRef, {
            'POST /api/tasks': (_url, init) => {
                const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
                capturedPostBody = body;
                const created: TaskItem = {
                    id: 'task-new',
                    type: (body.type as TaskItem['type']) ?? 'SPRAYING',
                    name: String(body.name ?? ''),
                    description: String(body.description ?? ''),
                    createdById: 'owner-1',
                    creatorRoleAtCreation: 'OWNER',
                    assignedUserId: String(body.assignedUserId ?? 'owner-1'),
                    fieldId: (body.fieldId as string) ?? null,
                    equipmentId: (body.equipmentId as string) ?? null,
                    substanceId: (body.substanceId as string) ?? null,
                    batchId: (body.batchId as string) ?? null,
                    bottlingId: null,
                    recordId: null,
                    startedAt: null,
                    completedAt: null,
                    dueDate: (body.dueDate as string) ?? null,
                    completed: false,
                };
                tasksRef.current = [created, ...tasksRef.current];
                return new Response(JSON.stringify(created), { status: 201 });
            },
        });

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'New task' }));

        const dialog = screen.getByRole('dialog');
        // Initially GENERAL: Batch selector is visible
        expect(within(dialog).getByLabelText('Batch')).toBeInTheDocument();

        // Select Batch under GENERAL first to verify switching to SPRAYING clears & hides it
        await fireEvent.click(within(dialog).getByLabelText('Batch'));
        await fireEvent.click(within(dialog).getByRole('option', { name: /Solaris 2026/i }));

        // Switch Task type to Spraying
        await fireEvent.click(within(dialog).getByLabelText('Task type'));
        await fireEvent.click(within(dialog).getByRole('option', { name: 'Spraying' }));

        // Batch is FORBIDDEN for SPRAYING -> hidden; Field & Substance are REQUIRED
        expect(within(dialog).queryByLabelText(/Batch/i)).not.toBeInTheDocument();
        expect(within(dialog).getByLabelText('Field (required)')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Substance (required)')).toBeInTheDocument();

        // Fill task name and try creating without required Field & Substance
        await fireEvent.input(within(dialog).getByLabelText('Task name (required)'), {
            target: { value: 'Evening copper spray' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

        expect(within(dialog).getByRole('alert')).toHaveTextContent(
            'Field, Substance are required for Spraying tasks.',
        );
        expect(capturedPostBody).toBeNull();

        // Select required Field and Substance, then submit
        await fireEvent.click(within(dialog).getByLabelText('Field (required)'));
        await fireEvent.click(
            within(dialog).getByRole('option', { name: 'Solaris (White, 45 ar)' }),
        );

        await fireEvent.click(within(dialog).getByLabelText('Substance (required)'));
        await fireEvent.click(within(dialog).getByRole('option', { name: 'Copper Sulfate' }));

        await fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('Evening copper spray')).toBeInTheDocument();
        });
        expect(capturedPostBody).toMatchObject({
            type: 'SPRAYING',
            name: 'Evening copper spray',
            fieldId: 'field-1',
            substanceId: 'sub-1',
        });
        expect(capturedPostBody?.['batchId']).toBeUndefined();
    });

    it('deletes a task after confirmation dialog', async () => {
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef);

        render(TasksPanel);

        await waitFor(() => {
            expect(screen.getByText('Morning mildew treatment')).toBeInTheDocument();
        });

        const row1 = screen.getByText('Morning mildew treatment').closest('tr')!;
        await fireEvent.click(within(row1).getByRole('button', { name: 'Delete' }));

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/Morning mildew treatment/)).toBeInTheDocument();

        await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(screen.queryByText('Morning mildew treatment')).not.toBeInTheDocument();
        });
    });

    it('auto-opens the New task modal when URL contains ?create=1', async () => {
        window.location.href = 'http://localhost/tasks?create=1';
        const tasksRef = { current: makeBaseTasks() };
        globalThis.fetch = buildFetchMock(tasksRef);

        render(TasksPanel);

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Create task')).toBeInTheDocument();
    });
});

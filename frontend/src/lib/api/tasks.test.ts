import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    completeTask,
    createTask,
    DEFAULT_TASK_TYPE_OPTIONS,
    deleteTask,
    getTaskById,
    getTasks,
    getTaskTypes,
    isTaskOverdue,
    reopenTask,
    updateTask,
} from './tasks';

type FetchCall = { url: string; init?: RequestInit };

describe('tasks API', () => {
    const originalFetch = globalThis.fetch;
    let calls: FetchCall[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('lists with filters, creates, updates, completes, reopens, and deletes tasks', async () => {
        const baseTask = {
            id: 'task-1',
            type: 'SPRAYING',
            name: 'Spray Solaris row',
            description: 'Apply copper treatment before rain',
            createdById: 'user-1',
            creatorRoleAtCreation: 'OWNER',
            assignedUserId: 'user-2',
            fieldId: 'field-1',
            equipmentId: 'eq-1',
            substanceId: 'sub-1',
            batchId: null,
            bottlingId: null,
            recordId: null,
            startedAt: '2026-05-10',
            completedAt: null,
            dueDate: '2026-05-12',
            completed: false,
        };

        const responses = [
            new Response(JSON.stringify([baseTask]), { status: 200 }),
            new Response(JSON.stringify(baseTask), { status: 200 }),
            new Response(JSON.stringify({ ...baseTask, name: 'Spray Solaris row #2' }), {
                status: 200,
            }),
            new Response(
                JSON.stringify({ ...baseTask, completed: true, completedAt: '2026-05-11' }),
                { status: 200 },
            ),
            new Response(JSON.stringify({ ...baseTask, completed: false, completedAt: null }), {
                status: 200,
            }),
            new Response(JSON.stringify(baseTask), { status: 200 }),
            new Response(null, { status: 204 }),
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return responses.shift()!;
        }) as unknown as typeof fetch;

        const list = await getTasks({ status: 'PLANNED', type: 'SPRAYING' });
        expect(list).toHaveLength(1);
        expect(calls[0]?.url).toBe('/api/tasks?status=PLANNED&type=SPRAYING');

        const created = await createTask({
            type: 'SPRAYING',
            name: '  Spray Solaris row  ',
            description: 'Apply copper treatment before rain',
            fieldId: 'field-1',
            substanceId: 'sub-1',
            dueDate: '2026-05-12',
        });
        expect(created.id).toBe('task-1');
        expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
            type: 'SPRAYING',
            name: 'Spray Solaris row',
            description: 'Apply copper treatment before rain',
            fieldId: 'field-1',
            substanceId: 'sub-1',
            dueDate: '2026-05-12',
        });

        const updated = await updateTask('task-1', {
            type: 'SPRAYING',
            name: 'Spray Solaris row #2',
            fieldId: 'field-1',
            substanceId: 'sub-1',
        });
        expect(updated.name).toBe('Spray Solaris row #2');
        expect(calls[2]?.init?.method).toBe('PUT');

        const completed = await completeTask('task-1');
        expect(completed.completed).toBe(true);
        expect(calls[3]?.url).toBe('/api/tasks/task-1/complete');
        expect(calls[3]?.init?.method).toBe('PATCH');

        const reopened = await reopenTask('task-1');
        expect(reopened.completed).toBe(false);
        expect(calls[4]?.url).toBe('/api/tasks/task-1/reopen');

        const single = await getTaskById('task-1');
        expect(single.fieldId).toBe('field-1');

        await deleteTask('task-1');
        expect(calls[6]?.url).toBe('/api/tasks/task-1');
        expect(calls[6]?.init?.method).toBe('DELETE');
    });

    it('fetches task type relation rules and falls back cleanly on error', async () => {
        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify([
                    {
                        type: 'EQUIPMENT_MAINTENANCE',
                        field: 'FORBIDDEN',
                        equipment: 'REQUIRED',
                        substance: 'FORBIDDEN',
                        batch: 'FORBIDDEN',
                        bottling: 'FORBIDDEN',
                        record: 'FORBIDDEN',
                    },
                ]),
                { status: 200 },
            )) as unknown as typeof fetch;

        const types = await getTaskTypes();
        expect(types).toHaveLength(1);
        expect(types[0]?.equipment).toBe('REQUIRED');

        globalThis.fetch = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
        const fallback = await getTaskTypes();
        expect(fallback).toEqual(DEFAULT_TASK_TYPE_OPTIONS);
    });

    it('detects overdue planned tasks accurately', () => {
        expect(isTaskOverdue({ completed: false, dueDate: '2026-05-01' }, '2026-05-10')).toBe(true);
        expect(isTaskOverdue({ completed: false, dueDate: '2026-05-10' }, '2026-05-10')).toBe(false);
        expect(isTaskOverdue({ completed: true, dueDate: '2026-05-01' }, '2026-05-10')).toBe(false);
        expect(isTaskOverdue({ completed: false, dueDate: null }, '2026-05-10')).toBe(false);
    });
});

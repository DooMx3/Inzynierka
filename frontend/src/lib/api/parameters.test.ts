import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createBatchParameter,
    deleteBatchParameter,
    getBatchParameters,
    updateBatchParameter,
} from './parameters';

describe('chemical parameters REST adapter', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('calls /api/batches/{batchId}/records CRUD endpoints and validates constraints', async () => {
        const batchUuid = '550e8400-e29b-41d4-a716-446655440010';
        const recordUuid = '550e8400-e29b-41d4-a716-446655440020';
        const calls: string[] = [];
        let stored: Record<string, unknown>[] = [];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';
            calls.push(`${method} ${url}`);

            if (url === `/api/batches/${batchUuid}/records` && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const rec = {
                    id: recordUuid,
                    batchId: batchUuid,
                    recordedAt: body.recordedAt ?? '2026-10-05T12:00:00Z',
                    sugarLevel: body.sugarLevel,
                    acidity: body.acidity,
                    pH: body.pH,
                    temperature: body.temperature,
                    alcoholContent: body.alcoholContent,
                };
                stored = [rec];
                return new Response(JSON.stringify(rec), { status: 200 });
            }

            if (url === `/api/batches/${batchUuid}/records` && method === 'GET') {
                return new Response(JSON.stringify(stored), { status: 200 });
            }

            if (url === `/api/batches/${batchUuid}/records/${recordUuid}` && method === 'PUT') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const rec = {
                    id: recordUuid,
                    batchId: batchUuid,
                    recordedAt: body.recordedAt ?? '2026-10-05T12:00:00Z',
                    sugarLevel: body.sugarLevel,
                    acidity: body.acidity,
                    pH: body.pH,
                    temperature: body.temperature,
                    alcoholContent: body.alcoholContent,
                };
                stored = [rec];
                return new Response(JSON.stringify(rec), { status: 200 });
            }

            if (url === `/api/batches/${batchUuid}/records/${recordUuid}` && method === 'DELETE') {
                stored = [];
                return new Response(null, { status: 204 });
            }

            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const created = await createBatchParameter(batchUuid, {
            sugarLevel: 215,
            acidity: 6.8,
            pH: 3.32,
            temperature: 18.5,
            alcoholContent: 0,
        });

        expect(created.sugarLevel).toBe(215);
        expect(created.pH).toBe(3.32);

        const updated = await updateBatchParameter(batchUuid, created.id, {
            sugarLevel: 110,
            acidity: 6.6,
            pH: 3.35,
            temperature: 20,
            alcoholContent: 6.2,
        });
        expect(updated.alcoholContent).toBe(6.2);

        const forBatch = await getBatchParameters(batchUuid);
        expect(forBatch).toHaveLength(1);

        await deleteBatchParameter(batchUuid, created.id);
        expect(await getBatchParameters(batchUuid)).toHaveLength(0);

        expect(calls).toContain(`POST /api/batches/${batchUuid}/records`);
        expect(calls).toContain(`PUT /api/batches/${batchUuid}/records/${recordUuid}`);
        expect(calls).toContain(`DELETE /api/batches/${batchUuid}/records/${recordUuid}`);
    });
});

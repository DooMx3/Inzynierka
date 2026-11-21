import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createPestObservation,
    deletePestObservation,
    getPestObservations,
    updatePestObservation,
} from './pests';

describe('pests API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('supports query by fieldId and CRUD operations', async () => {
        const responses = [
            new Response(
                JSON.stringify([
                    {
                        id: 'p-1',
                        fieldId: 'f-1',
                        type: 'DISEASE',
                        name: 'Black rot',
                        observedAt: '2026-07-10',
                        description: 'Leaf spots',
                        active: true,
                    },
                ]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'p-2',
                    fieldId: 'f-1',
                    type: 'PEST',
                    name: 'Spider mite',
                    observedAt: '2026-07-15',
                    description: '',
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'p-2',
                    fieldId: 'f-1',
                    type: 'PEST',
                    name: 'Red spider mite',
                    observedAt: '2026-07-15',
                    description: 'Lower canopy',
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(null, { status: 200 }),
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return responses.shift()!;
        }) as unknown as typeof fetch;

        const list = await getPestObservations('f-1');
        expect(calls[0]?.url).toBe('/api/pest-observations?fieldId=f-1');
        expect(list[0]?.name).toBe('Black rot');

        const created = await createPestObservation({
            fieldId: 'f-1',
            type: 'PEST',
            name: 'Spider mite',
            observedAt: '2026-07-15',
        });
        expect(created.type).toBe('PEST');

        const updated = await updatePestObservation('p-2', {
            fieldId: 'f-1',
            type: 'PEST',
            name: 'Red spider mite',
            observedAt: '2026-07-15',
            description: 'Lower canopy',
        });
        expect(updated.description).toBe('Lower canopy');

        await deletePestObservation('p-2');
        expect(calls[3]?.init?.method).toBe('DELETE');
    });
});

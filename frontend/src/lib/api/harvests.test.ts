import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createHarvest, deleteHarvest, getHarvests, updateHarvest } from './harvests';

describe('harvests API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('lists, creates, updates, and deletes multi-field harvests', async () => {
        const sampleField = {
            id: 'f-1',
            areaAre: 25,
            grapeVariety: 'RIESLING',
            grapeVarietyName: 'Riesling',
            grapeColor: 'WHITE',
            active: true,
        };
        const responses = [
            new Response(
                JSON.stringify([
                    {
                        id: 'h-1',
                        fields: [sampleField],
                        amountKg: 350,
                        harvestDate: '2026-09-20',
                        active: true,
                    },
                ]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'h-2',
                    fields: [sampleField],
                    amountKg: 420,
                    harvestDate: '2026-09-25',
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'h-2',
                    fields: [sampleField],
                    amountKg: 450,
                    harvestDate: '2026-09-25',
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

        const list = await getHarvests();
        expect(list[0]?.fields[0]?.grapeVarietyName).toBe('Riesling');

        const created = await createHarvest({
            fieldIds: ['f-1', 'f-1'],
            amountKg: 420,
            harvestDate: '2026-09-25',
        });
        expect(created.amountKg).toBe(420);
        expect(JSON.parse(String(calls[1]?.init?.body)).fieldIds).toEqual(['f-1']);

        const updated = await updateHarvest('h-2', {
            fieldIds: ['f-1'],
            amountKg: 450,
            harvestDate: '2026-09-25',
        });
        expect(updated.amountKg).toBe(450);

        await deleteHarvest('h-2');
        expect(calls[3]?.init?.method).toBe('DELETE');
    });
});

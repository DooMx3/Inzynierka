import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createEquipment,
    deleteEquipment,
    getEquipmentById,
    getEquipmentList,
    updateEquipment,
} from './equipment';

type FetchCall = { url: string; init?: RequestInit };

describe('equipment API', () => {
    const originalFetch = globalThis.fetch;
    let calls: FetchCall[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('lists, creates, updates, and deletes equipment', async () => {
        const responses = [
            new Response(
                JSON.stringify([
                    {
                        id: 'eq-1',
                        name: 'Fermentor #1',
                        type: 'Fermentor',
                        endOfTechnicalInspection: '2027-05-01',
                        active: true,
                    },
                ]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'eq-2',
                    name: 'Oak Barrel',
                    type: 'Barrel',
                    endOfTechnicalInspection: null,
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'eq-2',
                    name: 'Oak Barrel #2',
                    type: 'Barrel',
                    endOfTechnicalInspection: '2028-01-10',
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'eq-2',
                    name: 'Oak Barrel #2',
                    type: 'Barrel',
                    endOfTechnicalInspection: '2028-01-10',
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

        const list = await getEquipmentList();
        expect(list).toHaveLength(1);
        expect(list[0]?.name).toBe('Fermentor #1');

        const created = await createEquipment({ name: 'Oak Barrel', type: 'Barrel' });
        expect(created.id).toBe('eq-2');
        expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
            name: 'Oak Barrel',
            type: 'Barrel',
        });

        const updated = await updateEquipment('eq-2', {
            name: 'Oak Barrel #2',
            type: 'Barrel',
            endOfTechnicalInspection: '2028-01-10',
        });
        expect(updated.name).toBe('Oak Barrel #2');

        const single = await getEquipmentById('eq-2');
        expect(single.endOfTechnicalInspection).toBe('2028-01-10');

        await deleteEquipment('eq-2');
        expect(calls[4]?.url).toBe('/api/equipment/eq-2');
        expect(calls[4]?.init?.method).toBe('DELETE');
    });
});

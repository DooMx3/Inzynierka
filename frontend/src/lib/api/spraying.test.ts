import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createSpraying,
    deleteSpraying,
    getSprayings,
    isPlannedSpraying,
    updateSpraying,
} from './spraying';

describe('spraying API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('creates planned sprayings with sprayingDate: null, recognizes null sprayingDate as planned, completes via PUT, and deletes', async () => {
        const responses = [
            new Response(
                JSON.stringify({
                    id: 'sp-1',
                    fieldId: 'f-1',
                    equipmentId: 'eq-1',
                    substanceId: 's-1',
                    sprayingDate: null,
                    quantity: 12,
                    due: '2026-05-01T12:00:00.000Z',
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify([
                    {
                        id: 'sp-1',
                        fieldId: 'f-1',
                        equipmentId: 'eq-1',
                        substanceId: 's-1',
                        sprayingDate: null,
                        quantity: 12,
                        due: '2026-05-01T12:00:00.000Z',
                    },
                ]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'sp-1',
                    fieldId: 'f-1',
                    equipmentId: 'eq-1',
                    substanceId: 's-1',
                    sprayingDate: '2026-05-01T10:00:00.000Z',
                    quantity: 12,
                    due: '2026-05-01T12:00:00.000Z',
                }),
                { status: 200 },
            ),
            new Response(null, { status: 204 }),
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return responses.shift()!;
        }) as unknown as typeof fetch;

        const created = await createSpraying(
            {
                fieldId: 'f-1',
                equipmentId: 'eq-1',
                substanceId: 's-1',
                sprayingDate: null,
                quantity: 12,
                due: '2026-05-01',
            },
            true,
        );

        const postBody = JSON.parse(String(calls[0]?.init?.body ?? '{}'));
        expect(postBody.sprayingDate).toBeNull();
        expect(postBody.due).toBe('2026-05-01T12:00:00.000Z');
        expect(isPlannedSpraying(created, undefined, new Date('2027-01-01'))).toBe(true);

        const list = await getSprayings();
        expect(list).toHaveLength(1);
        expect(isPlannedSpraying(list[0]!)).toBe(true);

        const completed = await updateSpraying(
            'sp-1',
            {
                fieldId: 'f-1',
                equipmentId: 'eq-1',
                substanceId: 's-1',
                sprayingDate: '2026-05-01T10:00:00.000Z',
                quantity: 12,
                due: '2026-05-01T12:00:00.000Z',
            },
            false,
        );
        expect(isPlannedSpraying(completed, undefined, new Date('2026-05-02T00:00:00Z'))).toBe(
            false,
        );

        await deleteSpraying('sp-1');
        expect(calls.at(-1)?.init?.method).toBe('DELETE');
    });
});

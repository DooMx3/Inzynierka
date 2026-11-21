import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createSpraying,
    deleteSpraying,
    getPlannedSprayingIds,
    getSprayings,
    isPlannedSpraying,
    updateSpraying,
} from './spraying';

describe('spraying API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('creates planned and completed sprayings, tracks planned state, and deletes', async () => {
        const responses = [
            new Response(
                JSON.stringify({
                    id: 'sp-1',
                    fieldId: 'f-1',
                    equipmentId: 'eq-1',
                    substanceId: 's-1',
                    sprayingDate: '2026-12-01T12:00:00.000Z',
                    quantity: 12,
                    due: '2026-12-01T12:00:00.000Z',
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
                        sprayingDate: '2026-12-01T12:00:00.000Z',
                        quantity: 12,
                        due: '2026-12-01T12:00:00.000Z',
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
                    sprayingDate: '2026-11-19T10:00:00.000Z',
                    quantity: 12,
                    due: '2026-12-01T12:00:00.000Z',
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
                sprayingDate: '2026-12-01',
                quantity: 12,
                due: '2026-12-01',
            },
            true,
        );

        expect(getPlannedSprayingIds().has(created.id)).toBe(true);
        expect(isPlannedSpraying(created, getPlannedSprayingIds(), new Date('2027-01-01'))).toBe(
            true,
        );

        const list = await getSprayings();
        expect(list).toHaveLength(1);

        const completed = await updateSpraying(
            'sp-1',
            {
                fieldId: 'f-1',
                equipmentId: 'eq-1',
                substanceId: 's-1',
                sprayingDate: '2026-11-19T10:00:00.000Z',
                quantity: 12,
                due: '2026-12-01T12:00:00.000Z',
            },
            false,
        );
        expect(getPlannedSprayingIds().has('sp-1')).toBe(false);
        expect(
            isPlannedSpraying(completed, getPlannedSprayingIds(), new Date('2026-11-20T00:00:00Z')),
        ).toBe(false);

        await deleteSpraying('sp-1');
        expect(calls.at(-1)?.init?.method).toBe('DELETE');
    });
});

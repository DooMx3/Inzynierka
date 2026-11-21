import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createSubstance,
    deleteSubstance,
    getSubstances,
    patchSubstance,
    updateSubstance,
} from './substances';

describe('substances API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('handles CRUD and PATCH operations for substances', async () => {
        const responses = [
            new Response(
                JSON.stringify([{ id: 's-1', name: 'Sulfur', active: true }]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({ id: 's-2', name: 'Copper', active: true }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({ id: 's-2', name: 'Copper sulfate', active: true }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({ id: 's-2', name: 'Bordeaux mixture', active: true }),
                { status: 200 },
            ),
            new Response(null, { status: 200 }),
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return responses.shift()!;
        }) as unknown as typeof fetch;

        const list = await getSubstances();
        expect(list).toHaveLength(1);
        expect(list[0]?.name).toBe('Sulfur');

        const created = await createSubstance('  Copper ');
        expect(created.name).toBe('Copper');
        expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ name: 'Copper' });

        const updated = await updateSubstance('s-2', 'Copper sulfate');
        expect(updated.name).toBe('Copper sulfate');

        const patched = await patchSubstance('s-2', 'Bordeaux mixture');
        expect(patched.name).toBe('Bordeaux mixture');
        expect(calls[3]?.init?.method).toBe('PATCH');

        await deleteSubstance('s-2');
        expect(calls[4]?.init?.method).toBe('DELETE');
    });
});

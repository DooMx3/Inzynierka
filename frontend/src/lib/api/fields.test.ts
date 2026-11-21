import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createField,
    DEFAULT_GRAPE_COLORS,
    DEFAULT_GRAPE_VARIETIES,
    deleteField,
    formatFieldLabel,
    getFields,
    getGrapeColors,
    getGrapeTypes,
    updateField,
} from './fields';

describe('fields API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[] = [];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('creates, updates, lists, and deletes fields including custom variety', async () => {
        const responses = [
            new Response(
                JSON.stringify([
                    {
                        id: 'f-1',
                        areaAre: 30,
                        grapeVariety: 'SOLARIS',
                        grapeVarietyName: 'Solaris',
                        grapeColor: 'WHITE',
                        active: true,
                    },
                ]),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'f-2',
                    areaAre: 15.5,
                    grapeVariety: 'OTHER',
                    grapeVarietyName: 'Bianca',
                    grapeColor: 'WHITE',
                    active: true,
                }),
                { status: 200 },
            ),
            new Response(
                JSON.stringify({
                    id: 'f-2',
                    areaAre: 18,
                    grapeVariety: 'PINOT_NOIR',
                    grapeVarietyName: 'Pinot Noir',
                    grapeColor: 'RED',
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

        const fields = await getFields();
        expect(fields).toHaveLength(1);
        expect(formatFieldLabel(fields[0]!)).toBe('Solaris (White, 30 ar)');

        const created = await createField({
            areaAre: 15.5,
            grapeVariety: 'OTHER',
            otherGrapeVariety: 'Bianca',
            grapeColor: 'WHITE',
        });
        expect(created.grapeVarietyName).toBe('Bianca');
        expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
            areaAre: 15.5,
            grapeVariety: 'OTHER',
            otherGrapeVariety: 'Bianca',
            grapeColor: 'WHITE',
        });

        const updated = await updateField('f-2', {
            areaAre: 18,
            grapeVariety: 'PINOT_NOIR',
            grapeColor: 'RED',
        });
        expect(updated.grapeColor).toBe('RED');

        await deleteField('f-2');
        expect(calls[3]?.init?.method).toBe('DELETE');
    });

    it('falls back to default varieties and colors when catalog endpoints return 403', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })) as unknown as typeof fetch;

        expect(await getGrapeTypes()).toEqual(DEFAULT_GRAPE_VARIETIES);
        expect(await getGrapeColors()).toEqual(DEFAULT_GRAPE_COLORS);
    });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createIngredient,
    deleteIngredient,
    getBatchIngredients,
    getIngredients,
    syncBatchIngredients,
    updateIngredient,
    type Ingredient,
} from './ingredients';

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('Ingredients API', () => {
    const originalFetch = globalThis.fetch;
    let items: Ingredient[];
    let batchEntries: {
        id: string;
        ingredientId: string;
        ingredientNumber: string;
        ingredientName: string;
        quantityGrams: number;
    }[];

    beforeEach(() => {
        items = [
            {
                id: 'ing-1',
                number: 'ING-001',
                name: 'Sucrose (Chaptalization sugar)',
                energyContent: 400,
                fat: 0,
                saturatedFattyAcids: 0,
                carbs: 100,
                sugars: 100,
                protein: 0,
                salt: 0,
                fibers: 0,
            },
            {
                id: 'ing-2',
                number: 'ING-002',
                name: 'Potassium metabisulfite (K2S2O5)',
                energyContent: 0,
                fat: 0,
                saturatedFattyAcids: 0,
                carbs: 0,
                sugars: 0,
                protein: 0,
                salt: 0,
                fibers: 0,
            },
        ];
        batchEntries = [
            {
                id: 'entry-1',
                ingredientId: 'ing-2',
                ingredientNumber: 'ING-002',
                ingredientName: 'Potassium metabisulfite (K2S2O5)',
                quantityGrams: 12.5,
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';

            if (url === '/api/ingredients' && method === 'GET') {
                return jsonResponse(items);
            }
            if (url === '/api/ingredients' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}')) as Omit<
                    Ingredient,
                    'id' | 'number'
                >;
                const created: Ingredient = {
                    id: `ing-${items.length + 1}`,
                    number: `ING-${String(items.length + 1).padStart(3, '0')}`,
                    ...body,
                };
                items.push(created);
                return jsonResponse(created);
            }
            if (url.startsWith('/api/ingredients/') && method === 'PUT') {
                const id = decodeURIComponent(url.replace('/api/ingredients/', ''));
                const body = JSON.parse(String(init?.body ?? '{}')) as Omit<
                    Ingredient,
                    'id' | 'number'
                >;
                const existing = items.find((item) => item.id === id);
                if (!existing) {
                    return new Response('', { status: 404 });
                }
                const updated: Ingredient = { ...existing, ...body };
                items = items.map((item) => (item.id === id ? updated : item));
                return jsonResponse(updated);
            }
            if (url.startsWith('/api/ingredients/') && method === 'DELETE') {
                const id = decodeURIComponent(url.replace('/api/ingredients/', ''));
                items = items.filter((item) => item.id !== id);
                return new Response('', { status: 204 });
            }

            if (url === '/api/batches/batch-1/ingredients' && method === 'GET') {
                return jsonResponse(batchEntries);
            }
            if (url === '/api/batches/batch-1/ingredients' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}')) as {
                    ingredientId: string;
                    quantityGrams: number;
                };
                const ing = items.find((i) => i.id === body.ingredientId);
                const created = {
                    id: `entry-${batchEntries.length + 1}`,
                    ingredientId: body.ingredientId,
                    ingredientNumber: ing?.number ?? 'ING-999',
                    ingredientName: ing?.name ?? body.ingredientId,
                    quantityGrams: body.quantityGrams,
                };
                batchEntries.push(created);
                return jsonResponse(created);
            }
            if (url.startsWith('/api/batches/batch-1/ingredients/') && method === 'PUT') {
                const entryId = decodeURIComponent(
                    url.replace('/api/batches/batch-1/ingredients/', ''),
                );
                const body = JSON.parse(String(init?.body ?? '{}')) as {
                    ingredientId: string;
                    quantityGrams: number;
                };
                const existing = batchEntries.find((e) => e.id === entryId);
                if (!existing) {
                    return new Response('', { status: 404 });
                }
                const updated = {
                    ...existing,
                    ingredientId: body.ingredientId,
                    quantityGrams: body.quantityGrams,
                };
                batchEntries = batchEntries.map((e) => (e.id === entryId ? updated : e));
                return jsonResponse(updated);
            }
            if (url.startsWith('/api/batches/batch-1/ingredients/') && method === 'DELETE') {
                const entryId = decodeURIComponent(
                    url.replace('/api/batches/batch-1/ingredients/', ''),
                );
                batchEntries = batchEntries.filter((e) => e.id !== entryId);
                return new Response('', { status: 204 });
            }

            return new Response('', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('fetches, creates, updates, and deletes catalogue ingredients via /api/ingredients', async () => {
        const loaded = await getIngredients();
        expect(loaded).toHaveLength(2);

        const created = await createIngredient({
            name: 'Bentonite',
            energyContent: 0,
            fat: 0,
            saturatedFattyAcids: 0,
            carbs: 0,
            sugars: 0,
            protein: 0,
            salt: 0.1,
            fibers: 0,
        });
        expect(created.number).toBe('ING-003');
        expect(created.salt).toBe(0.1);

        const updated = await updateIngredient(created.id, {
            ...created,
            name: 'Sodium Bentonite',
        });
        expect(updated.name).toBe('Sodium Bentonite');

        await deleteIngredient(created.id);
        const remaining = await getIngredients();
        expect(remaining.some((item) => item.id === created.id)).toBe(false);
    });

    it('synchronizes batch ingredient additions, updates, and removals via /api/batches/{batchId}/ingredients', async () => {
        const initial = await getBatchIngredients('batch-1');
        expect(initial).toHaveLength(1);
        expect(initial[0]?.quantityGrams).toBe(12.5);

        const synced = await syncBatchIngredients(
            'batch-1',
            [
                {
                    id: 'entry-1',
                    ingredientId: 'ing-2',
                    ingredientName: 'Potassium metabisulfite (K2S2O5)',
                    quantityGrams: 18,
                },
                {
                    id: 'bi-temp-new',
                    ingredientId: 'ing-1',
                    ingredientName: 'Sucrose (Chaptalization sugar)',
                    quantityGrams: 500,
                },
            ],
            initial,
        );

        expect(synced).toHaveLength(2);
        expect(synced[0]?.quantityGrams).toBe(18);
        expect(synced[1]?.ingredientId).toBe('ing-1');

        const afterRemoval = await syncBatchIngredients('batch-1', [], synced);
        expect(afterRemoval).toHaveLength(0);
        expect(await getBatchIngredients('batch-1')).toHaveLength(0);
    });
});

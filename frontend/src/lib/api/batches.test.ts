import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createBatch,
    deleteBatch,
    getBatches,
    setBatchSpoiled,
    updateBatch,
} from './batches';

describe('batches REST adapter', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('creates batches via /api/batches/from-harvest and /api/batches, blocks spoiled sources, updates, and deletes', async () => {
        type StoredBatch = {
            id: string;
            name: string;
            stage: string;
            quantity: number;
            isSpoiled: boolean;
            deleted: boolean;
            createdAt: string;
        };

        let seq = 1;
        let stored: StoredBatch[] = [];
        const harvestSourcesByBatch: Record<string, { id: string; harvestId: string; quantity: number }[]> = {};
        const batchSourcesByTarget: Record<string, { id: string; sourceBatchId: string; targetBatchId: string; quantity: number }[]> = {};

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';

            if (url === '/api/batches' && method === 'GET') {
                return new Response(JSON.stringify(stored.filter((b) => !b.deleted)), {
                    status: 200,
                });
            }

            if (url === '/api/batches/from-harvest' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const id = `550e8400-e29b-41d4-a716-44665544000${seq++}`;
                const total = (body.harvests ?? []).reduce(
                    (acc: number, item: { quantity: number }) => acc + Number(item.quantity),
                    0,
                );
                const created: StoredBatch = {
                    id,
                    name: body.name,
                    stage: 'MUST',
                    quantity: total,
                    isSpoiled: false,
                    deleted: false,
                    createdAt: `2026-10-0${seq}T10:00:00`,
                };
                stored.push(created);
                harvestSourcesByBatch[id] = (body.harvests ?? []).map(
                    (h: { harvestId: string; quantity: number }, idx: number) => ({
                        id: `hs-${idx}`,
                        harvestId: h.harvestId,
                        quantity: h.quantity,
                    }),
                );
                return new Response(JSON.stringify(created), { status: 200 });
            }

            if (url === '/api/batches' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const id = `550e8400-e29b-41d4-a716-44665544000${seq++}`;
                const created: StoredBatch = {
                    id,
                    name: body.name,
                    stage: body.stage,
                    quantity: body.quantity,
                    isSpoiled: Boolean(body.isSpoiled),
                    deleted: false,
                    createdAt: `2026-10-0${seq}T10:00:00`,
                };
                stored.push(created);
                return new Response(JSON.stringify(created), { status: 200 });
            }

            const historyMatch = url.match(/^\/api\/batches\/([^/]+)\/history$/);
            if (historyMatch && method === 'GET') {
                const id = decodeURIComponent(historyMatch[1]!);
                const batch = stored.find((b) => b.id === id);
                return new Response(
                    JSON.stringify({
                        batch,
                        harvestSources: harvestSourcesByBatch[id] ?? [],
                        sourceChanges: batchSourcesByTarget[id] ?? [],
                        targetChanges: [],
                    }),
                    { status: 200 },
                );
            }

            const ingMatch = url.match(/^\/api\/batches\/([^/]+)\/ingredients$/);
            if (ingMatch && method === 'GET') {
                return new Response('[]', { status: 200 });
            }

            const spoilMatch = url.match(/^\/api\/batches\/([^/]+)\/spoiled\?spoiled=(true|false)$/);
            if (spoilMatch && method === 'PATCH') {
                const id = decodeURIComponent(spoilMatch[1]!);
                const nextSpoiled = spoilMatch[2] === 'true';
                stored = stored.map((b) => (b.id === id ? { ...b, isSpoiled: nextSpoiled } : b));
                const found = stored.find((b) => b.id === id)!;
                return new Response(JSON.stringify(found), { status: 200 });
            }

            const sourceLinkMatch = url.match(
                /^\/api\/batches\/([^/]+)\/sources\/([^/?]+)\?quantity=(.+)$/,
            );
            if (sourceLinkMatch && method === 'POST') {
                const sourceBatchId = decodeURIComponent(sourceLinkMatch[1]!);
                const targetBatchId = decodeURIComponent(sourceLinkMatch[2]!);
                const quantity = Number(decodeURIComponent(sourceLinkMatch[3]!));
                const entry = {
                    id: `bs-${Date.now()}`,
                    sourceBatchId,
                    targetBatchId,
                    quantity,
                };
                batchSourcesByTarget[targetBatchId] = [
                    ...(batchSourcesByTarget[targetBatchId] ?? []),
                    entry,
                ];
                return new Response(JSON.stringify(entry), { status: 200 });
            }

            const singleMatch = url.match(/^\/api\/batches\/([^/?]+)$/);
            if (singleMatch && method === 'GET') {
                const id = decodeURIComponent(singleMatch[1]!);
                const found = stored.find((b) => b.id === id);
                return new Response(JSON.stringify(found), { status: found ? 200 : 404 });
            }
            if (singleMatch && method === 'PUT') {
                const id = decodeURIComponent(singleMatch[1]!);
                const body = JSON.parse(String(init?.body ?? '{}'));
                stored = stored.map((b) =>
                    b.id === id
                        ? { ...b, name: body.name, stage: body.stage, quantity: body.quantity }
                        : b,
                );
                const found = stored.find((b) => b.id === id)!;
                return new Response(JSON.stringify(found), { status: 200 });
            }
            if (singleMatch && method === 'DELETE') {
                const id = decodeURIComponent(singleMatch[1]!);
                stored = stored.filter((b) => b.id !== id);
                return new Response(null, { status: 204 });
            }

            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const must = await createBatch({
            name: 'Solaris Must',
            stage: 'MUST',
            quantity: 200,
            equipmentId: 'eq-press-1',
            equipmentLabel: 'Press #1',
            sources: [
                {
                    sourceId: '550e8400-e29b-41d4-a716-446655440099',
                    sourceType: 'HARVEST',
                    label: 'Solaris Harvest (250 kg)',
                    quantity: 200,
                },
            ],
        });

        expect(must.batchNumber).toBe('BATCH-1001');
        expect(must.equipmentId).toBe('eq-press-1');
        await setBatchSpoiled(must.id, true);

        await expect(
            createBatch({
                name: 'Fermenting Solaris',
                stage: 'FERMENTING',
                quantity: 180,
                equipmentId: 'eq-ferm-1',
                equipmentLabel: 'Fermentor #1',
                sources: [
                    {
                        sourceId: must.id,
                        sourceType: 'BATCH',
                        label: must.name,
                        quantity: 180,
                    },
                ],
            }),
        ).rejects.toThrow(/marked as spoiled/);

        await setBatchSpoiled(must.id, false);
        const ferm = await createBatch({
            name: 'Fermenting Solaris',
            stage: 'FERMENTING',
            quantity: 180,
            equipmentId: 'eq-ferm-1',
            equipmentLabel: 'Fermentor #1',
            sources: [
                {
                    sourceId: must.id,
                    sourceType: 'BATCH',
                    label: must.name,
                    quantity: 180,
                },
            ],
        });

        expect(ferm.batchNumber).toBe('BATCH-1002');
        const updated = await updateBatch(ferm.id, {
            ...ferm,
            quantity: 175,
        });
        expect(updated.quantity).toBe(175);

        await deleteBatch(ferm.id);
        expect(await getBatches('FERMENTING')).toHaveLength(0);
    });
});

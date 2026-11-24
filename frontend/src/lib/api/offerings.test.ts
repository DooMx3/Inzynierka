import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createBatch } from '$lib/api/batches';
import { createBatchParameter } from '$lib/api/parameters';
import {
    createOffering,
    deleteOffering,
    getCustomerBottleDetails,
    getOfferings,
    updateOffering,
} from './offerings';

describe('offerings API & customer bottle provenance', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('lists and creates backend offerings, and supports edit/delete overlay', async () => {
        let postedBody = '';
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/offerings' && init?.method === 'POST') {
                postedBody = String(init.body);
                return new Response(
                    JSON.stringify({
                        id: 'off-1',
                        organisationId: 'org-1',
                        wineId: 'wine-1',
                        wineName: 'Solaris Reserve',
                        wineDescription: 'Crisp citrus aroma',
                        price: 55,
                    }),
                    { status: 200 },
                );
            }
            if (url === '/api/offerings') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'off-1',
                            organisationId: 'org-1',
                            wineId: 'wine-1',
                            wineName: 'Solaris Reserve',
                            wineDescription: 'Crisp citrus aroma',
                            price: 55,
                        },
                    ]),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify([]), { status: 200 });
        }) as unknown as typeof fetch;

        const created = await createOffering({ wineId: 'wine-1', price: 55 });
        expect(created.wineName).toBe('Solaris Reserve');
        expect(JSON.parse(postedBody)).toEqual({ wineId: 'wine-1', price: 55 });

        const updated = await updateOffering('off-1', { price: 62 });
        expect(updated.price).toBe(62);

        await deleteOffering('off-1');
        expect(await getOfferings()).toHaveLength(0);
    });

    it('falls back to local bottled batch offering when backend bottling UUID is missing and resolves full bottle provenance', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ error: 'Wine bottling not found' }), {
                status: 404,
            })) as unknown as typeof fetch;

        const aged = await createBatch({
            name: 'Regent Barrel #1',
            stage: 'AGED',
            quantity: 200,
            equipmentId: 'eq-bar-1',
            equipmentLabel: 'French Oak Barrel (Barrel)',
            sources: [
                {
                    sourceId: 'h-1',
                    sourceType: 'HARVEST',
                    label: 'Harvest 2026-09-12 | Regent | 300 kg',
                    quantity: 300,
                },
            ],
        });

        const bottled = await createBatch({
            name: 'Regent Grand Reserve 2026',
            stage: 'BOTTLED',
            quantity: 180,
            equipmentId: 'eq-bot-1',
            equipmentLabel: 'Bottling Line #1',
            description: 'Velvety cherry and French oak notes.',
            sources: [
                {
                    sourceId: aged.id,
                    sourceType: 'BATCH',
                    label: `${aged.batchNumber} | ${aged.name}`,
                    quantity: 180,
                },
            ],
        });

        await createBatchParameter(bottled.id, {
            sugarLevel: 2.8,
            acidity: 5.9,
            pH: 3.52,
            alcoholContent: 13.5,
        });

        const offering = await createOffering({
            wineId: bottled.id,
            wineName: bottled.name,
            wineDescription: bottled.description,
            price: 79,
            organisationName: 'Winnica Lubelska',
        });

        expect(offering.localOnly).toBe(true);

        const details = await getCustomerBottleDetails(offering.id);
        expect(details.wineName).toBe('Regent Grand Reserve 2026');
        expect(details.vineyardName).toBe('Winnica Lubelska');
        expect(details.grapeVariety).toBe('Regent');
        expect(details.harvestDate).toBe('2026-09-12');
        expect(details.barrelType).toContain('French Oak Barrel');
        expect(details.barrelDuration).not.toBeNull();
        expect(details.parameters.alcoholContent).toBe(13.5);
        expect(details.parameters.pH).toBe(3.52);
        expect(details.nutrients.energyKcal).toBeGreaterThan(0);
    });
});

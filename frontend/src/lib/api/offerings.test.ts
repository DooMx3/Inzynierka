import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createBatch } from '$lib/api/batches';
import { createBatchParameter } from '$lib/api/parameters';
import {
    createOffering,
    deleteOffering,
    getCustomerBottleDetails,
    getOfferings,
    getOfferingsByOrganisation,
    readWinePhotoAsDataUrl,
    updateOffering,
} from './offerings';

describe('offerings API, vineyard scoping, wine photos & customer bottle provenance', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('lists, scopes by organisationId, preserves wine photo, and supports edit/delete overlay', async () => {
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
                        {
                            id: 'off-other',
                            organisationId: 'org-2',
                            wineId: 'wine-2',
                            wineName: 'Other Vineyard Merlot',
                            wineDescription: 'Should not leak into org-1',
                            price: 90,
                        },
                    ]),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify([]), { status: 200 });
        }) as unknown as typeof fetch;

        const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

        const created = await createOffering({
            wineId: 'wine-1',
            price: 55,
            imageUrl: samplePhoto,
            organisationName: 'Winnica Pierwsza',
        });
        expect(created.wineName).toBe('Solaris Reserve');
        expect(created.imageUrl).toBe(samplePhoto);
        expect(JSON.parse(postedBody)).toEqual({ wineId: 'wine-1', price: 55 });

        const org1Only = await getOfferingsByOrganisation('org-1');
        expect(org1Only).toHaveLength(1);
        expect(org1Only[0]?.id).toBe('off-1');
        expect(org1Only[0]?.imageUrl).toBe(samplePhoto);

        const updated = await updateOffering('off-1', { price: 62, imageUrl: null });
        expect(updated.price).toBe(62);
        expect(updated.imageUrl).toBeNull();

        await deleteOffering('off-1');
        expect(await getOfferingsByOrganisation('org-1')).toHaveLength(0);
        expect(await getOfferings('org-2')).toHaveLength(1);
    });

    it('converts valid PNG/JPEG/WebP files to Data URLs and rejects unsupported file types', async () => {
        const pngFile = new File([new Uint8Array([137, 80, 78, 71])], 'bottle.png', {
            type: 'image/png',
        });
        const dataUrl = await readWinePhotoAsDataUrl(pngFile);
        expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);

        const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
        await expect(readWinePhotoAsDataUrl(badFile)).rejects.toThrow(
            'Choose a PNG, JPEG, or WebP wine image.',
        );
    });

    it('falls back to local bottled batch offering when backend bottling UUID is missing and resolves full bottle provenance with photo', async () => {
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

        const photoDataUrl = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
        const offering = await createOffering({
            wineId: bottled.id,
            wineName: bottled.name,
            wineDescription: bottled.description,
            price: 79,
            imageUrl: photoDataUrl,
            organisationId: 'org-lubelska',
            organisationName: 'Winnica Lubelska',
        });

        expect(offering.localOnly).toBe(true);
        expect(offering.imageUrl).toBe(photoDataUrl);

        const details = await getCustomerBottleDetails(offering.id);
        expect(details.wineName).toBe('Regent Grand Reserve 2026');
        expect(details.vineyardName).toBe('Winnica Lubelska');
        expect(details.organisationId).toBe('org-lubelska');
        expect(details.imageUrl).toBe(photoDataUrl);
        expect(details.grapeVariety).toBe('Regent');
        expect(details.harvestDate).toBe('2026-09-12');
        expect(details.barrelType).toContain('French Oak Barrel');
        expect(details.barrelDuration).not.toBeNull();
        expect(details.parameters.alcoholContent).toBe(13.5);
        expect(details.parameters.pH).toBe(3.52);
        expect(details.nutrients.energyKcal).toBeGreaterThan(0);
    });

    it('links remote Offering bottling wineId to backend Batch.id via GET /api/offerings/{id}/history', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/offerings' || url === '/api/offerings/off-db-1') {
                const payload = {
                    id: 'off-db-1',
                    organisationId: 'org-1',
                    wineId: 'bottling-uuid-1',
                    wineName: 'Chardonnay Grand Cru',
                    wineDescription: 'Mineral finish',
                    price: 78,
                };
                return new Response(
                    JSON.stringify(url === '/api/offerings' ? [payload] : payload),
                    { status: 200 },
                );
            }
            if (url === '/api/offerings/off-db-1/history') {
                return new Response(
                    JSON.stringify({
                        batch: {
                            id: 'batch-db-1',
                            name: 'Chardonnay Lot #4',
                            stage: 'BOTTLED',
                            quantity: 250,
                            createdAt: '2026-11-05T10:00:00',
                        },
                        harvestSources: [],
                        sourceChanges: [],
                        targetChanges: [],
                    }),
                    { status: 200 },
                );
            }
            if (url === '/api/batches') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'batch-db-1',
                            name: 'Chardonnay Lot #4',
                            stage: 'BOTTLED',
                            quantity: 250,
                            isSpoiled: false,
                            deleted: false,
                            createdAt: '2026-11-05T10:00:00',
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/batches/batch-db-1/records') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'rec-db-1',
                            batchId: 'batch-db-1',
                            recordedAt: '2026-11-05T11:00:00Z',
                            sugarLevel: 2.8,
                            acidity: 6.4,
                            pH: 3.28,
                            temperature: 16,
                            alcoholContent: 13.6,
                        },
                    ]),
                    { status: 200 },
                );
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const list = await getOfferingsByOrganisation('org-1');
        expect(list).toHaveLength(1);
        expect(list[0]?.alcoholPercent).toBe(13.6);
        expect(list[0]?.wineStyle).toBe('Dry wine');

        const bottle = await getCustomerBottleDetails('off-db-1');
        expect(bottle.parameters.alcoholContent).toBe(13.6);
        expect(bottle.parameters.pH).toBe(3.28);
        expect(bottle.bottledDate).toBe('2026-11-05');
    });
});

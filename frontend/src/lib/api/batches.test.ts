import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createBatch,
    deleteBatch,
    getBatches,
    setBatchSpoiled,
    updateBatch,
} from './batches';

describe('batches adapter', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('creates batches with auto-generated numbers and blocks spoiled batches from next stages', async () => {
        const must = await createBatch({
            name: 'Solaris Must',
            stage: 'MUST',
            quantity: 200,
            equipmentId: 'eq-press-1',
            equipmentLabel: 'Press #1',
            sources: [
                {
                    sourceId: 'h-1',
                    sourceType: 'HARVEST',
                    label: 'Solaris Harvest (250 kg)',
                    quantity: 200,
                },
            ],
        });

        expect(must.batchNumber).toBe('BATCH-1001');
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

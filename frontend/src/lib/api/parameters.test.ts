import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createBatchParameter,
    deleteBatchParameter,
    getBatchParameters,
    updateBatchParameter,
} from './parameters';

describe('chemical parameters adapter', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('stores, updates, and deletes chemical readings linked to a batch', async () => {
        const created = await createBatchParameter('batch-1', {
            sugarLevel: 215,
            acidity: 6.8,
            pH: 3.32,
            temperature: 18.5,
            alcoholContent: 0,
        });

        expect(created.sugarLevel).toBe(215);
        expect(created.pH).toBe(3.32);

        const updated = await updateBatchParameter(created.id, {
            sugarLevel: 110,
            acidity: 6.6,
            pH: 3.35,
            temperature: 20,
            alcoholContent: 6.2,
        });
        expect(updated.alcoholContent).toBe(6.2);

        const forBatch = await getBatchParameters('batch-1');
        expect(forBatch).toHaveLength(1);

        await deleteBatchParameter(created.id);
        expect(await getBatchParameters('batch-1')).toHaveLength(0);
    });
});

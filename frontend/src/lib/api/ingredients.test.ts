import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createIngredient,
    deleteIngredient,
    getIngredients,
    updateIngredient,
} from './ingredients';

describe('ingredients adapter', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('seeds default winery ingredients and performs CRUD with auto-generated numbers', async () => {
        const seeded = await getIngredients();
        expect(seeded.length).toBeGreaterThanOrEqual(5);

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
        expect(created.number).toBe('ING-006');

        const updated = await updateIngredient(created.id, {
            ...created,
            name: 'Sodium Bentonite',
        });
        expect(updated.name).toBe('Sodium Bentonite');

        await deleteIngredient(created.id);
        const remaining = await getIngredients();
        expect(remaining.some((item) => item.id === created.id)).toBe(false);
    });
});

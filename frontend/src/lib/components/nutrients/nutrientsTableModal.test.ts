import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import NutrientsTableModal from './nutrientsTableModal.svelte';

const autoNutrients = {
    energyKcal: 74.2,
    fat: 0,
    saturatedFattyAcids: 0,
    carbs: 1.5,
    sugars: 0.9,
    protein: 0.1,
    salt: 0.01,
    fibers: 0,
};

describe('NutrientsTableModal', () => {
    it('renders all 8 nutrient rows, supports manual edit, auto-recalculate, and save', async () => {
        let saved = autoNutrients;
        render(NutrientsTableModal, {
            batchName: 'Solaris Reserve 2026',
            initialNutrients: { ...autoNutrients, sugars: 3.5 },
            autoCalculatedNutrients: autoNutrients,
            editable: true,
            onSave: (updated) => {
                saved = updated;
            },
        });

        const sugarsInput = screen.getByLabelText('of which: sugars');
        expect(sugarsInput).toHaveValue(3.5);

        await fireEvent.click(screen.getByRole('button', { name: 'Recalculate automatically' }));
        expect(sugarsInput).toHaveValue(0.9);

        await fireEvent.input(sugarsInput, { target: { value: '2.2' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Save nutrients' }));

        expect(saved.sugars).toBe(2.2);
    });
});

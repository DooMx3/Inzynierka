import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import IngredientsCataloguePanel from './ingredientsCataloguePanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const oenologist = {
    id: 'u-3',
    firstname: 'Marek',
    lastname: 'Winny',
    email: 'marek@example.com',
    roles: ['OENOLOGIST'],
};

describe('IngredientsCataloguePanel', () => {
    beforeEach(() => {
        localStorage.clear();
        setUser(oenologist);
    });

    afterEach(() => {
        localStorage.clear();
        setUser(null);
    });

    it('renders seeded ingredients, expands per-100g nutrients, and creates a new ingredient after confirmation', async () => {
        render(IngredientsCataloguePanel);

        await waitFor(() => {
            expect(screen.getByText('Sucrose (Chaptalization sugar)')).toBeInTheDocument();
        });

        await fireEvent.click(
            screen.getByRole('button', {
                name: 'Expand nutrients for Sucrose (Chaptalization sugar)',
            }),
        );
        expect(screen.getByText('Carbs:')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'New ingredient' }));
        await fireEvent.input(screen.getByLabelText('Ingredient name'), {
            target: { value: 'Acacia Gum' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        // Confirmation dialog step
        const confirmButtons = screen.getAllByRole('button', { name: 'Confirm' });
        await fireEvent.click(confirmButtons.at(-1)!);

        await waitFor(() => {
            expect(screen.getByText('Acacia Gum')).toBeInTheDocument();
        });
    });
});

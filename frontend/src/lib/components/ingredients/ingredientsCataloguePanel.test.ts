import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import IngredientsCataloguePanel from './ingredientsCataloguePanel.svelte';
import { setUser } from '$lib/stores/session.svelte';
import type { Ingredient } from '$lib/api/ingredients';

const oenologist = {
    id: 'u-3',
    firstname: 'Marek',
    lastname: 'Winny',
    email: 'marek@example.com',
    roles: ['OENOLOGIST'],
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('IngredientsCataloguePanel', () => {
    const originalFetch = globalThis.fetch;
    let items: Ingredient[];

    beforeEach(() => {
        setUser(oenologist);
        items = [
            {
                id: 'ing-sucrose',
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
            return new Response('', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('renders backend ingredients, expands per-100g nutrients, and creates a new ingredient after confirmation', async () => {
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

        const confirmButtons = screen.getAllByRole('button', { name: 'Confirm' });
        await fireEvent.click(confirmButtons.at(-1)!);

        await waitFor(() => {
            expect(screen.getByText('Acacia Gum')).toBeInTheDocument();
        });
    });
});

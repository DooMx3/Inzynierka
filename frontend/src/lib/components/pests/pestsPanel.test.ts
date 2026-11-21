import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import PestsPanel from './pestsPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const worker = {
    id: 'u-2',
    firstname: 'Jan',
    lastname: 'Kowalski',
    email: 'jan@example.com',
    roles: ['WORKER'],
};

describe('PestsPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(worker);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('lists observations, expands description row, and adds a new record', async () => {
        let items = [
            {
                id: 'p-1',
                fieldId: 'f-1',
                type: 'DISEASE',
                name: 'Powdery mildew',
                observedAt: '2026-06-12',
                description: 'White powder on upper leaf surface.',
                active: true,
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/fields') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'f-1',
                            areaAre: 15,
                            grapeVariety: 'REGENT',
                            grapeVarietyName: 'Regent',
                            grapeColor: 'RED',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/pest-observations' && init?.method === 'POST') {
                const body = JSON.parse(String(init.body));
                const created = {
                    id: 'p-2',
                    fieldId: body.fieldId,
                    type: body.type,
                    name: body.name,
                    observedAt: body.observedAt,
                    description: body.description ?? '',
                    active: true,
                };
                items = [...items, created];
                return new Response(JSON.stringify(created), { status: 200 });
            }
            return new Response(JSON.stringify(items), { status: 200 });
        }) as unknown as typeof fetch;

        render(PestsPanel);

        await waitFor(() => {
            expect(screen.getByText('Powdery mildew')).toBeInTheDocument();
        });

        expect(
            screen.queryByText('White powder on upper leaf surface.'),
        ).not.toBeInTheDocument();
        await fireEvent.click(
            screen.getByRole('button', { name: 'Expand notes for Powdery mildew' }),
        );
        expect(screen.getByText('White powder on upper leaf surface.')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'New observation' }));
        await fireEvent.input(screen.getByLabelText('Pest or disease name'), {
            target: { value: 'Downy mildew' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => {
            expect(screen.getByText('Downy mildew')).toBeInTheDocument();
        });
    });
});

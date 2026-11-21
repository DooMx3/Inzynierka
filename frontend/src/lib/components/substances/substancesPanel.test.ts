import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import SubstancesPanel from './substancesPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'u-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: ['OWNER'],
};

describe('SubstancesPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(owner);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('lists, adds, and deletes spraying substances with confirmation', async () => {
        let substances = [{ id: 's-1', name: 'Magic water', active: true }];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/substances' && init?.method === 'POST') {
                const body = JSON.parse(String(init.body));
                const created = { id: 's-2', name: body.name, active: true };
                substances = [...substances, created];
                return new Response(JSON.stringify(created), { status: 200 });
            }
            if (url.startsWith('/api/substances/') && init?.method === 'DELETE') {
                substances = substances.filter((item) => !url.endsWith(item.id));
                return new Response(null, { status: 200 });
            }
            return new Response(JSON.stringify(substances), { status: 200 });
        }) as unknown as typeof fetch;

        render(SubstancesPanel);

        await waitFor(() => {
            expect(screen.getByText('Magic water')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'New substance' }));
        await fireEvent.input(screen.getByLabelText('Substance name'), {
            target: { value: 'Sulfur spray' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('Sulfur spray')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
        await fireEvent.click(deleteButtons[0]!);
        const dialogDelete = screen.getAllByRole('button', { name: 'Delete' }).at(-1)!;
        await fireEvent.click(dialogDelete);

        await waitFor(() => {
            expect(screen.queryByText('Magic water')).not.toBeInTheDocument();
        });
    });
});

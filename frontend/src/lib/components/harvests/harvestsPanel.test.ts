import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import HarvestsPanel from './harvestsPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const worker = {
    id: 'u-2',
    firstname: 'Jan',
    lastname: 'Kowalski',
    email: 'jan@example.com',
    roles: ['WORKER'],
};

describe('HarvestsPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(worker);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('renders harvests, expands harvested fields, and adds a new harvest', async () => {
        const fieldA = {
            id: 'f-1',
            areaAre: 40,
            grapeVariety: 'PINOT_NOIR',
            grapeVarietyName: 'Pinot Noir',
            grapeColor: 'RED',
            active: true,
        };
        let harvests = [
            {
                id: 'h-1',
                fields: [fieldA],
                amountKg: 280,
                harvestDate: '2026-09-18',
                active: true,
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/fields') {
                return new Response(JSON.stringify([fieldA]), { status: 200 });
            }
            if (url === '/api/harvests' && init?.method === 'POST') {
                const body = JSON.parse(String(init.body));
                const created = {
                    id: 'h-2',
                    fields: [fieldA],
                    amountKg: body.amountKg,
                    harvestDate: body.harvestDate,
                    active: true,
                };
                harvests = [...harvests, created];
                return new Response(JSON.stringify(created), { status: 200 });
            }
            return new Response(JSON.stringify(harvests), { status: 200 });
        }) as unknown as typeof fetch;

        render(HarvestsPanel);

        await waitFor(() => {
            expect(screen.getByText('280 kg')).toBeInTheDocument();
        });

        await fireEvent.click(
            screen.getByRole('button', { name: 'Expand fields for harvest on 2026-09-18' }),
        );
        expect(screen.getByText('Pinot Noir (Red, 40 ar)')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'New harvest' }));
        await fireEvent.input(screen.getByLabelText('Amount harvested (kg)'), {
            target: { value: '510' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => {
            expect(screen.getByText('510 kg')).toBeInTheDocument();
        });
    });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import FieldsPanel from './fieldsPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'u-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: ['OWNER'],
};

describe('FieldsPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(owner);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('loads vineyard fields and creates a new field', async () => {
        let fields = [
            {
                id: 'f-1',
                areaAre: 20,
                grapeVariety: 'SOLARIS',
                grapeVarietyName: 'Solaris',
                grapeColor: 'WHITE',
                active: true,
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/grape-types') {
                return new Response(
                    JSON.stringify([
                        { value: 'SOLARIS', label: 'Solaris', requiresCustomName: false },
                        { value: 'REGENT', label: 'Regent', requiresCustomName: false },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/grape-colors') {
                return new Response(JSON.stringify(['RED', 'WHITE']), { status: 200 });
            }
            if (url === '/api/fields' && init?.method === 'POST') {
                const body = JSON.parse(String(init.body));
                const created = {
                    id: 'f-2',
                    areaAre: body.areaAre,
                    grapeVariety: body.grapeVariety,
                    grapeVarietyName: 'Solaris',
                    grapeColor: body.grapeColor,
                    active: true,
                };
                fields = [...fields, created];
                return new Response(JSON.stringify(created), { status: 200 });
            }
            return new Response(JSON.stringify(fields), { status: 200 });
        }) as unknown as typeof fetch;

        render(FieldsPanel);

        await waitFor(() => {
            expect(screen.getByText('20 ar')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'New field' }));
        await fireEvent.input(screen.getByLabelText('Area (ar)'), {
            target: { value: '42.5' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('42.5 ar')).toBeInTheDocument();
        });
    });
});

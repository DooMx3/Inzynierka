import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import SprayingPanel from './sprayingPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const worker = {
    id: 'u-2',
    firstname: 'Jan',
    lastname: 'Kowalski',
    email: 'jan@example.com',
    roles: ['WORKER'],
};

describe('SprayingPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
        setUser(worker);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
        setUser(null);
    });

    it('renders completed sprayings, expands equipment details, and handles 403 substances gracefully', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/spraying') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'sp-past',
                            fieldId: 'f-1',
                            equipmentId: 'eq-1',
                            substanceId: 'sub-99990000',
                            sprayingDate: '2025-05-10T10:00:00.000Z',
                            quantity: 18,
                            due: '2025-05-10T10:00:00.000Z',
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/fields') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'f-1',
                            areaAre: 30,
                            grapeVariety: 'SOLARIS',
                            grapeVarietyName: 'Solaris',
                            grapeColor: 'WHITE',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/equipment') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'eq-1',
                            name: 'Sprayer #2',
                            type: 'Sprayer',
                            endOfTechnicalInspection: '2028-04-01',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/substances') {
                return new Response(JSON.stringify({ error: 'Owner required' }), { status: 403 });
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        render(SprayingPanel, { mode: 'completed' });

        await waitFor(() => {
            expect(screen.getByText('18 L')).toBeInTheDocument();
        });
        expect(screen.getByRole('status')).toHaveTextContent('Substance catalogue returned 403');

        await fireEvent.click(
            screen.getByRole('button', { name: /Expand spraying details/i }),
        );
        expect(screen.getByText('Sprayer #2 (Sprayer)')).toBeInTheDocument();
        expect(screen.getByText(/Inspection valid until: 2028-04-01/)).toBeInTheDocument();
    });

    it('renders planned sprayings and marks one completed', async () => {
        let records = [
            {
                id: 'sp-future',
                fieldId: 'f-1',
                equipmentId: 'eq-1',
                substanceId: 's-1',
                sprayingDate: '2099-06-01T12:00:00.000Z',
                quantity: 25,
                due: '2099-06-01T12:00:00.000Z',
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.startsWith('/api/spraying/') && init?.method === 'PUT') {
                const body = JSON.parse(String(init.body));
                records = [{ ...records[0]!, sprayingDate: body.sprayingDate }];
                return new Response(JSON.stringify(records[0]), { status: 200 });
            }
            if (url === '/api/spraying') {
                return new Response(JSON.stringify(records), { status: 200 });
            }
            if (url === '/api/fields') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'f-1',
                            areaAre: 30,
                            grapeVariety: 'SOLARIS',
                            grapeVarietyName: 'Solaris',
                            grapeColor: 'WHITE',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/equipment') {
                return new Response(
                    JSON.stringify([
                        { id: 'eq-1', name: 'Sprayer #1', type: 'Sprayer', active: true },
                    ]),
                    { status: 200 },
                );
            }
            if (url === '/api/substances') {
                return new Response(
                    JSON.stringify([{ id: 's-1', name: 'Copper', active: true }]),
                    { status: 200 },
                );
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        render(SprayingPanel, { mode: 'planned' });

        await waitFor(() => {
            expect(screen.getByText('Copper')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

        await waitFor(() => {
            expect(screen.getByText('No planned sprayings scheduled.')).toBeInTheDocument();
        });
    });
});

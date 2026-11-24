import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import OfferingsManagementPanel from './offeringsManagementPanel.svelte';
import { createBatch } from '$lib/api/batches';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@winnica.pl',
    roles: ['OWNER'],
};

const worker = {
    id: 'worker-1',
    firstname: 'Jan',
    lastname: 'Kowalski',
    email: 'jan@winnica.pl',
    roles: ['WORKER'],
};

describe('OfferingsManagementPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        window.location.href = 'http://localhost/management/offerings';
        localStorage.clear();
        setUser(owner);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    it('gates offerings management to OWNER role only', () => {
        setUser(worker);
        render(OfferingsManagementPanel);

        expect(
            screen.getByText('Only the organisation owner can manage wine offerings.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'New offering' })).not.toBeInTheDocument();
    });

    it('scopes offerings to owner vineyard, exposes direct vineyard catalog link, and supports CRUD with wine photo upload', async () => {
        const remoteOfferings = [
            {
                id: 'off-solaris-1',
                organisationId: 'org-1',
                wineId: 'wine-solaris-1',
                wineName: 'Solaris Reserve',
                wineDescription: 'Ripe pear and mineral finish.',
                price: 58,
            },
            {
                id: 'off-foreign-2',
                organisationId: 'org-foreign',
                wineId: 'wine-foreign-2',
                wineName: 'Foreign Vineyard Riesling',
                wineDescription: 'Must not appear in org-1 management.',
                price: 99,
            },
        ];

        const mockBatches: Record<string, unknown>[] = [];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';
            if (url === '/api/organisations') {
                return new Response(
                    JSON.stringify({
                        id: 'org-1',
                        name: 'Winnica Małopolska',
                        city: 'Kraków',
                    }),
                    { status: 200 },
                );
            }
            if (url === '/api/batches' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const created = {
                    id: 'batch-johanniter-1',
                    name: body.name,
                    stage: body.stage,
                    quantity: body.quantity,
                    isSpoiled: false,
                    deleted: false,
                    createdAt: '2026-10-10T10:00:00',
                };
                mockBatches.push(created);
                return new Response(JSON.stringify(created), { status: 200 });
            }
            if (url === '/api/batches' && method === 'GET') {
                return new Response(JSON.stringify(mockBatches), { status: 200 });
            }
            if (url.startsWith('/api/batches/') && url.endsWith('/history')) {
                return new Response(
                    JSON.stringify({ harvestSources: [], sourceChanges: [], targetChanges: [] }),
                    { status: 200 },
                );
            }
            if (url === '/api/offerings' && method === 'POST') {
                return new Response(JSON.stringify({ message: 'Bottling not found' }), {
                    status: 404,
                });
            }
            if (url === '/api/offerings') {
                return new Response(JSON.stringify(remoteOfferings), { status: 200 });
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        const bottledBatch = await createBatch({
            name: 'Johanniter Classic 2026',
            stage: 'BOTTLED',
            quantity: 220,
            equipmentId: 'eq-bot-1',
            equipmentLabel: 'Bottling Line #1',
            description: 'Crisp green apple and elderflower bouquet.',
            sources: [],
        });

        render(OfferingsManagementPanel);

        await waitFor(() => {
            expect(screen.getByText('Solaris Reserve')).toBeInTheDocument();
            expect(screen.getByText('58 PLN')).toBeInTheDocument();
        });

        // Foreign vineyard offering is strictly filtered out
        expect(screen.queryByText('Foreign Vineyard Riesling')).not.toBeInTheDocument();

        // Direct shareable vineyard catalog link & QR banner
        expect(
            screen.getByText('http://localhost/offerings/vineyard/org-1'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Open vineyard catalog/i }),
        ).toHaveAttribute('href', '/offerings/vineyard/org-1');

        // Expand row details
        await fireEvent.click(
            screen.getByRole('button', { name: 'Toggle details for Solaris Reserve' }),
        );
        expect(screen.getByText('Ripe pear and mineral finish.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Open customer bottle view/i }),
        ).toHaveAttribute('href', '/offerings/off-solaris-1');

        // Create new offering from bottled batch with uploaded wine photo
        await fireEvent.click(screen.getByRole('button', { name: 'New offering' }));
        const createDialog = await screen.findByRole('dialog');
        const wineNameInput = within(createDialog).getByLabelText('Wine name') as HTMLInputElement;
        expect(wineNameInput.value).toBe(bottledBatch.name);

        const photoInput = within(createDialog)
            .getByLabelText('Choose wine photo')
            .querySelector('input[type="file"]') as HTMLInputElement;
        const photoFile = new File([new Uint8Array([137, 80, 78, 71])], 'johanniter.png', {
            type: 'image/png',
        });
        await fireEvent.change(photoInput, { target: { files: [photoFile] } });

        await waitFor(() => {
            expect(within(createDialog).getByAltText('Selected wine preview')).toBeInTheDocument();
        });

        await fireEvent.input(within(createDialog).getByLabelText('Price (PLN)'), {
            target: { value: '74' },
        });
        await fireEvent.click(within(createDialog).getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('Johanniter Classic 2026')).toBeInTheDocument();
            expect(screen.getByText('74 PLN')).toBeInTheDocument();
            expect(
                screen.getByAltText('Photo of Johanniter Classic 2026'),
            ).toBeInTheDocument();
        });

        // Edit Solaris Reserve price
        const solarisRow = screen.getByText('Solaris Reserve').closest('tr')!;
        await fireEvent.click(within(solarisRow).getByRole('button', { name: 'Edit' }));

        const editDialog = await screen.findByRole('dialog');
        await fireEvent.input(within(editDialog).getByLabelText('Price (PLN)'), {
            target: { value: '64' },
        });
        await fireEvent.click(within(editDialog).getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.getByText('64 PLN')).toBeInTheDocument();
        });

        // Delete Solaris Reserve
        const updatedSolarisRow = screen.getByText('Solaris Reserve').closest('tr')!;
        await fireEvent.click(within(updatedSolarisRow).getByRole('button', { name: 'Delete' }));

        const confirmDialog = await screen.findByRole('dialog');
        expect(
            within(confirmDialog).getByText(
                'Remove "Solaris Reserve" from your vineyard offerings catalog?',
            ),
        ).toBeInTheDocument();
        await fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(screen.queryByText('Solaris Reserve')).not.toBeInTheDocument();
        });
    });

    it('opens QrCodeModal for both individual bottle QR and vineyard catalog QR', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/organisations') {
                return new Response(
                    JSON.stringify({
                        id: 'org-1',
                        name: 'Winnica Sandomierska',
                        city: 'Sandomierz',
                    }),
                    { status: 200 },
                );
            }
            if (url === '/api/offerings') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'off-regent-99',
                            organisationId: 'org-1',
                            wineId: 'wine-99',
                            wineName: 'Regent Barrique',
                            wineDescription: 'Dark cherry and oak.',
                            price: 89,
                        },
                    ]),
                    { status: 200 },
                );
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        render(OfferingsManagementPanel);

        await waitFor(() => {
            expect(screen.getByText('Regent Barrique')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'QR code' }));
        const bottleModal = await screen.findByRole('dialog');
        expect(within(bottleModal).getByText('Wine bottle QR code')).toBeInTheDocument();
        expect(
            within(bottleModal).getByText('http://localhost/offerings/off-regent-99'),
        ).toBeInTheDocument();
        await fireEvent.click(within(bottleModal).getByRole('button', { name: 'OK' }));

        await fireEvent.click(screen.getByRole('button', { name: 'Catalog QR' }));
        const catalogModal = await screen.findByRole('dialog');
        expect(within(catalogModal).getByText('Vineyard catalog QR code')).toBeInTheDocument();
        expect(
            within(catalogModal).getByText('http://localhost/offerings/vineyard/org-1'),
        ).toBeInTheDocument();
    });
});

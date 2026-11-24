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

    it('supports owner CRUD (create from bottled batch, edit price, expand details, and delete)', async () => {
        const bottledBatch = await createBatch({
            name: 'Johanniter Classic 2026',
            stage: 'BOTTLED',
            quantity: 220,
            equipmentId: 'eq-bot-1',
            equipmentLabel: 'Bottling Line #1',
            description: 'Crisp green apple and elderflower bouquet.',
            sources: [],
        });

        const remoteOfferings = [
            {
                id: 'off-solaris-1',
                organisationId: 'org-1',
                wineId: 'wine-solaris-1',
                wineName: 'Solaris Reserve',
                wineDescription: 'Ripe pear and mineral finish.',
                price: 58,
            },
        ];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
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
            if (url === '/api/offerings' && init?.method === 'POST') {
                // Simulate local bottled batch not registered on backend /api/bottlings so local overlay fallback runs
                return new Response(JSON.stringify({ message: 'Bottling not found' }), {
                    status: 404,
                });
            }
            if (url === '/api/offerings') {
                return new Response(JSON.stringify(remoteOfferings), { status: 200 });
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        render(OfferingsManagementPanel);

        await waitFor(() => {
            expect(screen.getByText('Solaris Reserve')).toBeInTheDocument();
            expect(screen.getByText('58 PLN')).toBeInTheDocument();
        });

        // Expand row details
        await fireEvent.click(
            screen.getByRole('button', { name: 'Toggle details for Solaris Reserve' }),
        );
        expect(screen.getByText('Ripe pear and mineral finish.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Open customer bottle view/i }),
        ).toHaveAttribute('href', '/offerings/off-solaris-1');

        // Create new offering from bottled batch (auto-fills Wine name & Description)
        await fireEvent.click(screen.getByRole('button', { name: 'New offering' }));
        const createDialog = await screen.findByRole('dialog');
        const wineNameInput = within(createDialog).getByLabelText('Wine name') as HTMLInputElement;
        expect(wineNameInput.value).toBe(bottledBatch.name);

        await fireEvent.input(within(createDialog).getByLabelText('Price (PLN)'), {
            target: { value: '74' },
        });
        await fireEvent.click(within(createDialog).getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('Johanniter Classic 2026')).toBeInTheDocument();
            expect(screen.getByText('74 PLN')).toBeInTheDocument();
        });

        // Edit Solaris Reserve price
        const editButtons = screen.getAllByRole('button', { name: 'Edit' });
        const solarisRow = screen.getByText('Solaris Reserve').closest('tr')!;
        await fireEvent.click(within(solarisRow).getByRole('button', { name: 'Edit' }));
        expect(editButtons.length).toBeGreaterThanOrEqual(2);

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
                'Remove "Solaris Reserve" from the public offerings catalog?',
            ),
        ).toBeInTheDocument();
        await fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(screen.queryByText('Solaris Reserve')).not.toBeInTheDocument();
        });
    });

    it('opens QrCodeModal for an offering with /offerings/[id] bottle URL', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
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

        expect(screen.getByRole('link', { name: 'Customer view' })).toHaveAttribute(
            'href',
            '/offerings/off-regent-99',
        );

        await fireEvent.click(screen.getByRole('button', { name: 'QR code' }));

        const modal = await screen.findByRole('dialog');
        expect(within(modal).getByText('Wine bottle QR code')).toBeInTheDocument();
        expect(within(modal).getByText('Regent Barrique · 89 PLN')).toBeInTheDocument();
        expect(
            within(modal).getByText('http://localhost/offerings/off-regent-99'),
        ).toBeInTheDocument();

        const qrPreview = await within(modal).findByTestId('qr-svg-preview');
        expect(qrPreview).toBeInTheDocument();

        await fireEvent.click(within(modal).getByRole('button', { name: 'OK' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

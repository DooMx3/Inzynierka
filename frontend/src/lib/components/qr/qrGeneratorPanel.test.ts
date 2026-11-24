import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import QrGeneratorPanel from './qrGeneratorPanel.svelte';
import EquipmentQrPage from '../../../routes/qr/equipment/[id]/+page.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@vineyard.pl',
    roles: ['OWNER'],
};

const worker = {
    id: 'worker-1',
    firstname: 'Piotr',
    lastname: 'Kowalski',
    email: 'piotr@vineyard.pl',
    roles: ['WORKER'],
};

const oenologist = {
    id: 'oeno-1',
    firstname: 'Marek',
    lastname: 'Winny',
    email: 'marek@vineyard.pl',
    roles: ['OENOLOGIST'],
};

const sampleEquipment = [
    {
        id: 'eq-ferm-1',
        name: 'Fermentor #1',
        type: 'Fermentor',
        endOfTechnicalInspection: '2028-05-01',
        active: true,
    },
    {
        id: 'eq-barrel-2',
        name: 'French Oak Barrel #2',
        type: 'Barrel',
        endOfTechnicalInspection: null,
        active: true,
    },
    {
        id: 'eq-tractor-1',
        name: 'John Deere 5075E',
        type: 'Tractor',
        endOfTechnicalInspection: '2027-03-10',
        active: true,
    },
    {
        id: 'eq-sprayer-1',
        name: 'Vineyard Sprayer XL',
        type: 'Sprayer',
        endOfTechnicalInspection: '2027-04-15',
        active: true,
    },
];

const sampleOfferings = [
    {
        id: 'off-solaris-26',
        organisationId: 'org-1',
        wineId: 'batch-bottled-1',
        wineName: 'Solaris Estate Reserve',
        wineDescription: 'Crisp citrus and white peach aroma.',
        price: 68,
    },
];

describe('QrGeneratorPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        window.location.href = 'http://localhost/management/qr-codes';
        localStorage.clear();
        setUser(owner);
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/equipment') {
                return new Response(JSON.stringify(sampleEquipment), { status: 200 });
            }
            if (url === '/api/offerings') {
                return new Response(JSON.stringify(sampleOfferings), { status: 200 });
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    it('restricts access to organisation owners', () => {
        setUser(worker);
        render(QrGeneratorPanel);

        expect(
            screen.getByText('Only the organisation owner can generate QR codes.'),
        ).toBeInTheDocument();
    });

    it('excludes non-winery equipment (Tractor, Sprayer), includes Fermentor and Barrel, and generates SVG equipment QR modal', async () => {
        render(QrGeneratorPanel);

        const targetDropdown = await screen.findByLabelText('Target item');
        expect(targetDropdown).toHaveTextContent('Fermentor #1 (Fermentor)');

        // Open Target item dropdown and check filtered options
        await fireEvent.click(targetDropdown);

        expect(
            screen.getByRole('option', { name: 'Fermentor #1 (Fermentor)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'French Oak Barrel #2 (Barrel)' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Tractor/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Sprayer/i })).not.toBeInTheDocument();

        // Select Barrel and click Generate
        await fireEvent.click(
            screen.getByRole('option', { name: 'French Oak Barrel #2 (Barrel)' }),
        );
        await fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Equipment QR code')).toBeInTheDocument();
        expect(within(dialog).getByText('French Oak Barrel #2 (Barrel)')).toBeInTheDocument();
        expect(
            within(dialog).getByText('http://localhost/qr/equipment/eq-barrel-2'),
        ).toBeInTheDocument();

        const qrImage = await within(dialog).findByRole('img', {
            name: 'QR code for French Oak Barrel #2 (Barrel)',
        });
        expect(qrImage.getAttribute('src')).toContain('data:image/svg+xml;charset=utf-8,');
        expect(decodeURIComponent(qrImage.getAttribute('src') ?? '')).toContain('<svg');

        expect(within(dialog).getByRole('button', { name: 'Download SVG' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Print' })).toBeInTheDocument();

        await fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('switches to Wine bottle / offering category and generates /offerings/... QR URL', async () => {
        localStorage.setItem(
            'wms_production_batches_v1',
            JSON.stringify([
                {
                    id: 'batch-bottled-2',
                    batchNumber: 'BATCH-2002',
                    name: 'Regent Cuvée',
                    stage: 'BOTTLED',
                    quantity: 180,
                    equipmentId: 'eq-bot-1',
                    equipmentLabel: 'Bottling Line #1',
                    createdAt: '2026-10-12T10:00:00.000Z',
                    isSpoiled: false,
                    yeastId: 'EC1118',
                    description: '',
                    sources: [],
                    ingredients: [],
                    nutrientsOverride: null,
                },
            ]),
        );

        render(QrGeneratorPanel);

        const categoryDropdown = await screen.findByLabelText('QR category');
        await fireEvent.click(categoryDropdown);
        await fireEvent.click(
            screen.getByRole('option', { name: 'Wine bottle / offering' }),
        );

        const targetDropdown = screen.getByLabelText('Target item');
        expect(targetDropdown).toHaveTextContent(/Solaris Estate Reserve/i);

        // Unoffered bottled batch is also listed alongside offerings
        await fireEvent.click(targetDropdown);
        expect(
            screen.getByRole('option', { name: /Solaris Estate Reserve/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: /BATCH-2002 · Regent Cuvée/i }),
        ).toBeInTheDocument();

        await fireEvent.click(
            screen.getByRole('option', { name: /Solaris Estate Reserve/i }),
        );
        await fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Wine bottle QR code')).toBeInTheDocument();
        expect(
            within(dialog).getByText('http://localhost/offerings/off-solaris-26'),
        ).toBeInTheDocument();
    });
});

describe('Equipment QR smart routing page (/qr/equipment/[id])', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    it('shows role requirement card when scanned by a worker without Oenologist/Owner role', async () => {
        window.location.href = 'http://localhost/qr/equipment/eq-ferm-1';
        setUser(worker);

        render(EquipmentQrPage);

        await waitFor(() => {
            expect(screen.getByText('Winery access required')).toBeInTheDocument();
        });
        expect(screen.getByText(/Oenologist/)).toBeInTheDocument();
    });

    it('resolves empty winery equipment and redirects Oenologist to stage creator URL', async () => {
        window.location.href = 'http://localhost/qr/equipment/eq-ferm-1';
        setUser(oenologist);

        let replacedUrl = '';
        const originalReplace = window.location.replace.bind(window.location);
        window.location.replace = ((url: string | URL) => {
            replacedUrl = String(url);
        }) as typeof window.location.replace;

        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/equipment/eq-ferm-1') {
                return new Response(JSON.stringify(sampleEquipment[0]), { status: 200 });
            }
            return new Response('[]', { status: 200 });
        }) as unknown as typeof fetch;

        try {
            render(EquipmentQrPage);

            await waitFor(() => {
                expect(replacedUrl).toBe('/vinery/fermenting?equipmentId=eq-ferm-1&create=1');
            });
            expect(
                screen.getByRole('link', { name: /Continue to batch view/i }),
            ).toHaveAttribute('href', '/vinery/fermenting?equipmentId=eq-ferm-1&create=1');
        } finally {
            window.location.replace = originalReplace;
        }
    });
});

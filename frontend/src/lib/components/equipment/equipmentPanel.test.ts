import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import EquipmentPanel from './equipmentPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'u-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: ['OWNER'],
};

describe('EquipmentPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(owner);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        setUser(null);
    });

    it('blocks non-owners from viewing equipment management', () => {
        setUser({ ...owner, roles: ['WORKER'] });
        render(EquipmentPanel);

        expect(screen.getByText('Only the organisation owner can manage equipment.')).toBeInTheDocument();
    });

    it('loads equipment and creates a new piece of equipment', async () => {
        let items = [
            {
                id: 'eq-1',
                name: 'Press #1',
                type: 'Press',
                endOfTechnicalInspection: '2028-06-15',
                active: true,
            },
        ];

        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === 'POST') {
                const body = JSON.parse(String(init.body));
                const created = {
                    id: 'eq-2',
                    name: body.name,
                    type: body.type,
                    endOfTechnicalInspection: body.endOfTechnicalInspection ?? null,
                    active: true,
                };
                items = [...items, created];
                return new Response(JSON.stringify(created), { status: 200 });
            }
            return new Response(JSON.stringify(items), { status: 200 });
        }) as unknown as typeof fetch;

        render(EquipmentPanel);

        await waitFor(() => {
            expect(screen.getByText('Press #1')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'New equipment' }));
        await fireEvent.input(screen.getByLabelText('Equipment name'), {
            target: { value: 'Fermentor #4' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(screen.getByText('Fermentor #4')).toBeInTheDocument();
        });
    });

    it('renders inline QR code button only for winery equipment and opens QrCodeModal', async () => {
        window.location.href = 'http://localhost/management/equipment';
        const items = [
            {
                id: 'eq-ferm-1',
                name: 'Fermentor #1',
                type: 'Fermentor',
                endOfTechnicalInspection: null,
                active: true,
            },
            {
                id: 'eq-tractor-1',
                name: 'Field Tractor',
                type: 'Tractor',
                endOfTechnicalInspection: null,
                active: true,
            },
        ];

        globalThis.fetch = (async () =>
            new Response(JSON.stringify(items), { status: 200 })) as unknown as typeof fetch;

        render(EquipmentPanel);

        await waitFor(() => {
            expect(screen.getByText('Fermentor #1')).toBeInTheDocument();
            expect(screen.getByText('Field Tractor')).toBeInTheDocument();
        });

        const qrButtons = screen.getAllByRole('button', { name: 'QR code' });
        expect(qrButtons).toHaveLength(1);

        await fireEvent.click(qrButtons[0]!);

        await waitFor(() => {
            expect(screen.getByText('Equipment QR code')).toBeInTheDocument();
            expect(
                screen.getByText('http://localhost/qr/equipment/eq-ferm-1'),
            ).toBeInTheDocument();
        });
    });
});

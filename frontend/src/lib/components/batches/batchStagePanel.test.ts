import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import BatchStagePanel from './batchStagePanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const oenologist = {
    id: 'u-3',
    firstname: 'Marek',
    lastname: 'Winny',
    email: 'marek@example.com',
    roles: ['OENOLOGIST'],
};

describe('BatchStagePanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
        setUser(oenologist);
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/equipment') {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'eq-1',
                            name: 'Bottling Line #1',
                            type: 'Bottling line',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
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

    it('creates a bottled batch with confirmation, records chemical parameters in expanded row, toggles spoiled, and opens nutrients table', async () => {
        render(BatchStagePanel, { stage: 'BOTTLED' });

        await waitFor(() => {
            expect(screen.getByText('No bottled wine batches found.')).toBeInTheDocument();
        });

        await fireEvent.click(
            screen.getByRole('button', { name: 'New bottled wine batch' }),
        );
        await fireEvent.input(screen.getByLabelText('Batch name'), {
            target: { value: 'Solaris Grand Cuvée' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        // Confirmation dialog
        const confirmBtns = screen.getAllByRole('button', { name: 'Confirm' });
        await fireEvent.click(confirmBtns.at(-1)!);

        await waitFor(() => {
            expect(screen.getByText('Solaris Grand Cuvée')).toBeInTheDocument();
            expect(screen.getByText('BATCH-1001')).toBeInTheDocument();
        });

        // Add chemical parameter reading
        await fireEvent.click(screen.getByRole('button', { name: '+ Parameters' }));
        await fireEvent.input(screen.getByLabelText('Sugar level (g/L)'), {
            target: { value: '6.5' },
        });
        await fireEvent.input(screen.getByLabelText('Alcohol content (% vol)'), {
            target: { value: '13.2' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        // Wait for async reload, then expand row and verify chemical parameter reading appears
        const expandBtn = await waitFor(() =>
            screen.getByRole('button', { name: 'Expand details for Solaris Grand Cuvée' }),
        );
        await fireEvent.click(expandBtn);
        await waitFor(() => {
            expect(screen.getByText('6.5 g/L')).toBeInTheDocument();
            expect(screen.getByText('13.2 %')).toBeInTheDocument();
        });

        // Toggle spoiled status with confirmation
        await fireEvent.click(
            screen.getByRole('checkbox', { name: 'Spoiled status for Solaris Grand Cuvée' }),
        );
        expect(screen.getByText('Mark as spoiled')).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        await waitFor(() => {
            expect(screen.getByText('SPOILED')).toBeInTheDocument();
        });

        // Open Table of Nutrients
        await fireEvent.click(screen.getByRole('button', { name: 'Show nutrients' }));
        expect(
            screen.getByRole('table', { name: 'Table of nutrients' }),
        ).toBeInTheDocument();
    });

    it('supports QR highlight/auto-expand, Show all banner link, auto-create on empty vessel scan, and Bottle QR modal', async () => {
        localStorage.setItem(
            'wms_production_batches_v1',
            JSON.stringify([
                {
                    id: 'batch-qr-1',
                    batchNumber: 'BATCH-1055',
                    name: 'Riesling Reserve',
                    stage: 'BOTTLED',
                    quantity: 300,
                    equipmentId: 'eq-1',
                    equipmentLabel: 'Bottling Line #1 (Bottling line)',
                    createdAt: '2026-10-15T10:00:00.000Z',
                    isSpoiled: false,
                    yeastId: 'EC1118',
                    description: 'Estate bottled crisp white.',
                    sources: [],
                    ingredients: [],
                    nutrientsOverride: null,
                },
            ]),
        );
        window.location.href =
            'http://localhost/packed-products?equipmentId=eq-1&highlightBatchId=batch-qr-1';

        const view = render(BatchStagePanel, { stage: 'BOTTLED' });

        await waitFor(() => {
            expect(screen.getByText('Bottling Line #1 (Bottling line)', { selector: 'strong' })).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: 'Show all' })).toHaveAttribute(
            'href',
            '/packed-products',
        );

        const row = document.getElementById('batch-row-batch-qr-1');
        expect(row).not.toBeNull();
        expect(row).toHaveAttribute('data-highlighted', 'true');
        // Expanded automatically because highlightBatchId matches
        expect(screen.getByText('Estate bottled crisp white.')).toBeInTheDocument();

        // Bottle QR button opens QrCodeModal with /offerings/{batch.id}
        await fireEvent.click(screen.getByRole('button', { name: 'Bottle QR' }));
        expect(screen.getByText('Bottle QR code')).toBeInTheDocument();
        expect(
            screen.getByText('http://localhost/offerings/batch-qr-1'),
        ).toBeInTheDocument();

        view.unmount();

        // Verify empty equipment scan (?equipmentId=eq-1&create=1) auto-opens stage creator modal
        localStorage.clear();
        window.location.href = 'http://localhost/packed-products?equipmentId=eq-1&create=1';
        render(BatchStagePanel, { stage: 'BOTTLED' });

        await waitFor(() => {
            expect(screen.getByText('Create new bottled wine batch')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Location (winery equipment)')).toHaveTextContent(
            'Bottling Line #1 (Bottling line)',
        );
    });
});

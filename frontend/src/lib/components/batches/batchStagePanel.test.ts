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
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import ReportsPanel from './reportsPanel.svelte';
import { getSavedReports } from '$lib/api/reports';
import { setUser } from '$lib/stores/session.svelte';

const ownerUser = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@vineyard.pl',
    roles: ['OWNER'],
};

const workerUser = {
    id: 'worker-1',
    firstname: 'Piotr',
    lastname: 'Zieliński',
    email: 'piotr@vineyard.pl',
    roles: ['WORKER'],
};

const sampleFields = [
    {
        id: 'field-1',
        areaAre: 100,
        grapeVariety: 'SOLARIS',
        grapeVarietyName: 'Solaris',
        grapeColor: 'WHITE',
        active: true,
    },
];

const sampleHarvests = [
    {
        id: 'harvest-1',
        fields: sampleFields,
        amountKg: 650,
        harvestDate: '2026-09-12',
        active: true,
    },
];

const sampleBatches = [
    {
        id: 'batch-1',
        batchNumber: 'BATCH-1001',
        name: 'Solaris Reserve',
        stage: 'BOTTLED',
        quantity: 420,
        equipmentId: 'eq-1',
        equipmentLabel: 'Tank #1',
        createdAt: '2026-10-12T00:00:00.000Z',
        isSpoiled: false,
        yeastId: 'EC1118',
        description: '',
        sources: [],
        ingredients: [],
        nutrientsOverride: null,
    },
];

const buildFetchMock = (options?: { emptyAll?: boolean }) =>
    (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (options?.emptyAll) {
            return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/fields')) {
            return new Response(JSON.stringify(sampleFields), { status: 200 });
        }
        if (url.startsWith('/api/harvests')) {
            return new Response(JSON.stringify(sampleHarvests), { status: 200 });
        }
        if (url.endsWith('/pdf')) {
            return new Response(new Uint8Array([37, 80, 68, 70]), {
                status: 200,
                headers: { 'Content-Type': 'application/pdf' },
            });
        }
        return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;

describe('ReportsPanel', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        window.location.href = 'http://localhost/raports';
        localStorage.clear();
        setUser(ownerUser);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    it('shows the owner-only access gate message to non-owner users', () => {
        setUser(workerUser);
        globalThis.fetch = buildFetchMock();

        render(ReportsPanel);

        expect(
            screen.getByText(
                'Only the organisation owner can generate and view vineyard reports.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Generate report' }),
        ).not.toBeInTheDocument();
    });

    it('generates a Production efficiency report, shows confirmation modal, highlights row, and expands KPI summary on click', async () => {
        localStorage.setItem('wms_production_batches_v1', JSON.stringify(sampleBatches));
        globalThis.fetch = buildFetchMock();

        render(ReportsPanel);

        const generatorRegion = await screen.findByRole('region', { name: 'Generate report' });
        expect(within(generatorRegion).getByLabelText('Batch filter')).toBeInTheDocument();

        await fireEvent.input(within(generatorRegion).getByLabelText('Start date'), {
            target: { value: '2026-01-01' },
        });
        await fireEvent.input(within(generatorRegion).getByLabelText('End date'), {
            target: { value: '2026-12-31' },
        });

        await fireEvent.click(within(generatorRegion).getByRole('button', { name: 'Generate' }));

        // Confirmation modal matches Fig. 3.62
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Report generated')).toBeInTheDocument();
        expect(
            within(dialog).getByText(
                /Report has been generated and saved below\. Email delivery to anna@vineyard\.pl is queued \(pending backend mail endpoint\)\./,
            ),
        ).toBeInTheDocument();

        await fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Newly generated report appears in ResultsTable and is highlighted
        const resultsRegion = screen.getByRole('region', { name: 'Results' });
        const titleCell = within(resultsRegion).getByText('Production efficiency report');
        const reportRow = titleCell.closest('tr')!;
        expect(reportRow).toHaveAttribute('data-highlighted', 'true');
        expect(within(reportRow).getByText('2026-01-01 – 2026-12-31')).toBeInTheDocument();

        // KPI summary is initially collapsed; clicking the row expands it
        expect(within(resultsRegion).queryByText('Yield per hectare')).not.toBeInTheDocument();
        await fireEvent.click(titleCell);

        expect(within(resultsRegion).getByText('Yield per hectare')).toBeInTheDocument();
        expect(within(resultsRegion).getByText('650 kg/ha')).toBeInTheDocument();
        expect(within(resultsRegion).getByText('Avg. harvest to bottling')).toBeInTheDocument();
        expect(within(resultsRegion).getByText('Spoiled batches')).toBeInTheDocument();
        expect(within(resultsRegion).getByText('Bottled output')).toBeInTheDocument();
        expect(within(resultsRegion).getAllByText('420 L')).toHaveLength(2);
        expect(
            within(resultsRegion).getByText('BATCH-1001 · Solaris Reserve'),
        ).toBeInTheDocument();
    });

    it('displays empty-period alert without crashing when no data exists in the selected date range', async () => {
        globalThis.fetch = buildFetchMock();

        render(ReportsPanel);

        const generatorRegion = await screen.findByRole('region', { name: 'Generate report' });

        await fireEvent.input(within(generatorRegion).getByLabelText('Start date'), {
            target: { value: '2020-01-01' },
        });
        await fireEvent.input(within(generatorRegion).getByLabelText('End date'), {
            target: { value: '2020-01-31' },
        });

        await fireEvent.click(within(generatorRegion).getByRole('button', { name: 'Generate' }));

        const alert = await within(generatorRegion).findByRole('alert');
        expect(alert).toHaveTextContent(
            'No vineyard or production data was found for the selected time period.',
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(getSavedReports()).toHaveLength(0);
    });

    it('switches contextual parameter inputs when changing report type', async () => {
        globalThis.fetch = buildFetchMock();

        render(ReportsPanel);

        const generatorRegion = await screen.findByRole('region', { name: 'Generate report' });
        expect(within(generatorRegion).getByLabelText('Batch filter')).toBeInTheDocument();

        // Switch to Diversity of grapevine varieties -> Field filter
        await fireEvent.click(within(generatorRegion).getByLabelText('Report type'));
        await fireEvent.click(
            within(generatorRegion).getByRole('option', {
                name: 'Diversity of grapevine varieties',
            }),
        );
        expect(within(generatorRegion).getByLabelText('Field filter')).toBeInTheDocument();

        // Switch to Vineyard operations report -> Operation category
        await fireEvent.click(within(generatorRegion).getByLabelText('Report type'));
        await fireEvent.click(
            within(generatorRegion).getByRole('option', { name: 'Vineyard operations report' }),
        );
        expect(within(generatorRegion).getByLabelText('Operation category')).toBeInTheDocument();

        // Switch to Historical trend report -> Aggregation level
        await fireEvent.click(within(generatorRegion).getByLabelText('Report type'));
        await fireEvent.click(
            within(generatorRegion).getByRole('option', { name: 'Historical trend report' }),
        );
        expect(within(generatorRegion).getByLabelText('Aggregation level')).toBeInTheDocument();
    });

    it('exports CSV, triggers print, and deletes a saved report after confirmation', async () => {
        localStorage.setItem('wms_production_batches_v1', JSON.stringify(sampleBatches));
        globalThis.fetch = buildFetchMock();

        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        const originalPrint = window.print;

        const createObjectURLMock = mock(() => 'blob:mock-report-csv');
        const revokeObjectURLMock = mock(() => {});
        const printMock = mock(() => {});

        URL.createObjectURL = createObjectURLMock;
        URL.revokeObjectURL = revokeObjectURLMock;
        window.print = printMock;

        try {
            render(ReportsPanel);

            const generatorRegion = await screen.findByRole('region', { name: 'Generate report' });
            await fireEvent.input(within(generatorRegion).getByLabelText('Start date'), {
                target: { value: '2026-01-01' },
            });
            await fireEvent.input(within(generatorRegion).getByLabelText('End date'), {
                target: { value: '2026-12-31' },
            });
            await fireEvent.click(
                within(generatorRegion).getByRole('button', { name: 'Generate' }),
            );

            const createdDialog = await screen.findByRole('dialog');
            await fireEvent.click(within(createdDialog).getByRole('button', { name: 'OK' }));

            const resultsRegion = screen.getByRole('region', { name: 'Results' });
            const row = within(resultsRegion)
                .getByText('Production efficiency report')
                .closest('tr')!;

            // Download PDF action from POST /api/reports/{type}/pdf
            await fireEvent.click(within(row).getByRole('button', { name: 'Download PDF' }));
            await waitFor(() => {
                expect(createObjectURLMock).toHaveBeenCalledTimes(1);
            });

            // Export CSV action
            await fireEvent.click(within(row).getByRole('button', { name: 'Export CSV' }));
            expect(createObjectURLMock).toHaveBeenCalledTimes(2);
            expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-report-csv');

            // Print action
            await fireEvent.click(within(row).getByRole('button', { name: 'Print' }));
            expect(printMock).toHaveBeenCalledTimes(1);

            // Delete action with ConfirmationDialog
            await fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
            const confirmDialog = await screen.findByRole('dialog');
            expect(within(confirmDialog).getByText('Delete report')).toBeInTheDocument();
            expect(
                within(confirmDialog).getByText(/Production efficiency report/),
            ).toBeInTheDocument();

            await fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

            await waitFor(() => {
                expect(
                    within(resultsRegion).queryByText('Production efficiency report'),
                ).not.toBeInTheDocument();
            });
            expect(getSavedReports()).toHaveLength(0);
        } finally {
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            window.print = originalPrint;
        }
    });
});

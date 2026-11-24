import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import BatchStagePanel from './batchStagePanel.svelte';
import { saveBatchMetadata, type BatchStage } from '$lib/api/batches';
import { setUser } from '$lib/stores/session.svelte';

const oenologist = {
    id: 'u-3',
    firstname: 'Marek',
    lastname: 'Winny',
    email: 'marek@example.com',
    roles: ['OENOLOGIST'],
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('BatchStagePanel', () => {
    const originalFetch = globalThis.fetch;
    let dbBatches: {
        id: string;
        name: string;
        stage: BatchStage;
        quantity: number;
        isSpoiled: boolean;
        deleted: boolean;
        createdAt: string;
    }[];
    let dbRecords: {
        id: string;
        batchId: string;
        recordedAt: string;
        sugarLevel: number | null;
        acidity: number | null;
        pH: number | null;
        temperature: number | null;
        alcoholContent: number | null;
    }[];

    beforeEach(() => {
        localStorage.clear();
        setUser(oenologist);
        dbBatches = [];
        dbRecords = [];

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const rawUrl = String(input);
            const [pathname = '', search = ''] = rawUrl.split('?');
            const params = new URLSearchParams(search);
            const method = init?.method ?? 'GET';

            if (pathname === '/api/equipment' && method === 'GET') {
                return jsonResponse([
                    {
                        id: 'eq-1',
                        name: 'Bottling Line #1',
                        type: 'Bottling line',
                        active: true,
                    },
                ]);
            }
            if (pathname === '/api/ingredients' && method === 'GET') {
                return jsonResponse([]);
            }
            if (pathname === '/api/batches' && method === 'GET') {
                return jsonResponse(dbBatches.filter((b) => !b.deleted));
            }
            if (pathname === '/api/batches' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}')) as {
                    name: string;
                    stage: BatchStage;
                    quantity: number;
                    isSpoiled: boolean;
                };
                const created = {
                    id: `batch-${dbBatches.length + 1}`,
                    name: body.name,
                    stage: body.stage,
                    quantity: body.quantity,
                    isSpoiled: Boolean(body.isSpoiled),
                    deleted: false,
                    createdAt: '2026-10-15T10:00:00',
                };
                dbBatches.push(created);
                return jsonResponse(created);
            }

            const historyMatch = pathname.match(/^\/api\/batches\/([^/]+)\/history$/);
            if (historyMatch && method === 'GET') {
                return jsonResponse({ harvestSources: [], sourceChanges: [], targetChanges: [] });
            }

            const ingMatch = pathname.match(/^\/api\/batches\/([^/]+)\/ingredients$/);
            if (ingMatch && method === 'GET') {
                return jsonResponse([]);
            }

            const recMatch = pathname.match(/^\/api\/batches\/([^/]+)\/records$/);
            if (recMatch) {
                const batchId = decodeURIComponent(recMatch[1]!);
                if (method === 'GET') {
                    return jsonResponse(dbRecords.filter((r) => r.batchId === batchId));
                }
                if (method === 'POST') {
                    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
                    const created = {
                        id: `rec-${dbRecords.length + 1}`,
                        batchId,
                        recordedAt: '2026-10-15T12:00:00Z',
                        sugarLevel: (body.sugarLevel as number | null) ?? null,
                        acidity: (body.acidity as number | null) ?? null,
                        pH: (body.pH as number | null) ?? null,
                        temperature: (body.temperature as number | null) ?? null,
                        alcoholContent: (body.alcoholContent as number | null) ?? null,
                    };
                    dbRecords.push(created);
                    return jsonResponse(created);
                }
            }

            const spoilMatch = pathname.match(/^\/api\/batches\/([^/]+)\/spoiled$/);
            if (spoilMatch && method === 'PATCH') {
                const id = decodeURIComponent(spoilMatch[1]!);
                const found = dbBatches.find((b) => b.id === id);
                if (!found) {
                    return new Response('', { status: 404 });
                }
                found.isSpoiled = params.get('spoiled') === 'true';
                return jsonResponse(found);
            }

            const batchItemMatch = pathname.match(/^\/api\/batches\/([^/]+)$/);
            if (batchItemMatch && method === 'GET') {
                const id = decodeURIComponent(batchItemMatch[1]!);
                const found = dbBatches.find((b) => b.id === id);
                return found ? jsonResponse(found) : new Response('', { status: 404 });
            }

            return jsonResponse([]);
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

        await fireEvent.click(screen.getByRole('button', { name: 'New bottled wine batch' }));
        await fireEvent.input(screen.getByLabelText('Batch name'), {
            target: { value: 'Solaris Grand Cuvée' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        const confirmBtns = screen.getAllByRole('button', { name: 'Confirm' });
        await fireEvent.click(confirmBtns.at(-1)!);

        await waitFor(() => {
            expect(screen.getByText('Solaris Grand Cuvée')).toBeInTheDocument();
            expect(screen.getByText('BATCH-1001')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: '+ Parameters' }));
        await fireEvent.input(screen.getByLabelText('Sugar level (g/L)'), {
            target: { value: '6.5' },
        });
        await fireEvent.input(screen.getByLabelText('Alcohol content (% vol)'), {
            target: { value: '13.2' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        const expandBtn = await waitFor(() =>
            screen.getByRole('button', { name: 'Expand details for Solaris Grand Cuvée' }),
        );
        await fireEvent.click(expandBtn);
        await waitFor(() => {
            expect(screen.getByText('6.5 g/L')).toBeInTheDocument();
            expect(screen.getByText('13.2 %')).toBeInTheDocument();
        });

        await fireEvent.click(
            screen.getByRole('checkbox', { name: 'Spoiled status for Solaris Grand Cuvée' }),
        );
        expect(screen.getByText('Mark as spoiled')).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        await waitFor(() => {
            expect(screen.getByText('SPOILED')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Show nutrients' }));
        expect(screen.getByRole('table', { name: 'Table of nutrients' })).toBeInTheDocument();
    });

    it('supports QR highlight/auto-expand, Show all banner link, auto-create on empty vessel scan, and Bottle QR modal', async () => {
        dbBatches.push({
            id: 'batch-qr-1',
            name: 'Riesling Reserve',
            stage: 'BOTTLED',
            quantity: 300,
            isSpoiled: false,
            deleted: false,
            createdAt: '2026-10-15T10:00:00',
        });
        saveBatchMetadata('batch-qr-1', {
            equipmentId: 'eq-1',
            equipmentLabel: 'Bottling Line #1 (Bottling line)',
            yeastId: 'EC1118',
            description: 'Estate bottled crisp white.',
        });

        window.location.href =
            'http://localhost/packed-products?equipmentId=eq-1&highlightBatchId=batch-qr-1';

        const view = render(BatchStagePanel, { stage: 'BOTTLED' });

        await waitFor(() => {
            expect(
                screen.getByText('Bottling Line #1 (Bottling line)', { selector: 'strong' }),
            ).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: 'Show all' })).toHaveAttribute(
            'href',
            '/packed-products',
        );

        const row = document.getElementById('batch-row-batch-qr-1');
        expect(row).not.toBeNull();
        expect(row).toHaveAttribute('data-highlighted', 'true');
        expect(screen.getByText('Estate bottled crisp white.')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Bottle QR' }));
        expect(screen.getByText('Bottle QR code')).toBeInTheDocument();
        expect(screen.getByText('http://localhost/offerings/batch-qr-1')).toBeInTheDocument();

        view.unmount();

        dbBatches = [];
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

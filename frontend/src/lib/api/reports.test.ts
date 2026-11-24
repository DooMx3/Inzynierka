import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    deleteSavedReport,
    EmptyReportPeriodError,
    generateReport,
    getSavedReports,
} from './reports';

describe('reports API & storage', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        localStorage.clear();
    });

    it('generates and persists a report when period data exists, and deletes saved reports', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.startsWith('/api/fields')) {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'f-1',
                            areaAre: 100,
                            grapeVariety: 'SOLARIS',
                            grapeVarietyName: 'Solaris',
                            grapeColor: 'WHITE',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            if (url.startsWith('/api/harvests')) {
                return new Response(
                    JSON.stringify([
                        {
                            id: 'h-1',
                            fields: [
                                {
                                    id: 'f-1',
                                    areaAre: 100,
                                    grapeVariety: 'SOLARIS',
                                    grapeVarietyName: 'Solaris',
                                    grapeColor: 'WHITE',
                                    active: true,
                                },
                            ],
                            amountKg: 500,
                            harvestDate: '2026-09-10',
                            active: true,
                        },
                    ]),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify([]), { status: 200 });
        }) as unknown as typeof fetch;

        const saved = await generateReport(
            {
                type: 'PRODUCTION_EFFICIENCY',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
            },
            'owner@vineyard.pl',
        );

        expect(saved.emailQueuedTo).toBe('owner@vineyard.pl');
        expect(saved.content.kpis[0]?.value).toBe('500 kg/ha');
        expect(getSavedReports()).toHaveLength(1);

        deleteSavedReport(saved.id);
        expect(getSavedReports()).toHaveLength(0);
    });

    it('throws EmptyReportPeriodError when no records match the period', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify([]), { status: 200 })) as unknown as typeof fetch;

        await expect(
            generateReport({
                type: 'VINEYARD_OPERATIONS',
                startDate: '2026-01-01',
                endDate: '2026-01-31',
            }),
        ).rejects.toBeInstanceOf(EmptyReportPeriodError);
    });
});

import { describe, it, expect } from 'bun:test';
import {
    computeReportContent,
    formatReportAsCsv,
    type ReportInputDataset,
} from './reportCalculators';

const sampleDataset: ReportInputDataset = {
    fields: [
        {
            id: 'f-1',
            areaAre: 150,
            grapeVariety: 'SOLARIS',
            grapeVarietyName: 'Solaris',
            grapeColor: 'WHITE',
            active: true,
        },
        {
            id: 'f-2',
            areaAre: 50,
            grapeVariety: 'REGENT',
            grapeVarietyName: 'Regent',
            grapeColor: 'RED',
            active: true,
        },
    ],
    harvests: [
        {
            id: 'h-1',
            fields: [
                {
                    id: 'f-1',
                    areaAre: 150,
                    grapeVariety: 'SOLARIS',
                    grapeVarietyName: 'Solaris',
                    grapeColor: 'WHITE',
                    active: true,
                },
            ],
            amountKg: 600,
            harvestDate: '2026-09-05',
            active: true,
        },
    ],
    sprayings: [
        {
            id: 's-1',
            fieldId: 'f-1',
            equipmentId: 'eq-1',
            substanceId: 'sub-1',
            sprayingDate: '2026-06-12T10:00:00.000Z',
            quantity: 25,
            due: '2026-06-12T10:00:00.000Z',
        },
    ],
    pests: [
        {
            id: 'p-1',
            fieldId: 'f-2',
            type: 'DISEASE',
            name: 'Powdery mildew',
            observedAt: '2026-07-02',
            description: 'Minor leaf spots',
            active: true,
        },
    ],
    tasks: [
        {
            id: 't-1',
            type: 'FIELD_WORK',
            name: 'Canopy pruning',
            description: '',
            createdById: 'u-1',
            creatorRoleAtCreation: 'OWNER',
            assignedUserId: 'u-1',
            fieldId: 'f-1',
            equipmentId: null,
            substanceId: null,
            batchId: null,
            bottlingId: null,
            recordId: null,
            startedAt: '2026-06-01',
            completedAt: '2026-06-02',
            dueDate: '2026-06-03',
            completed: true,
        },
    ],
    batches: [
        {
            id: 'b-1',
            batchNumber: 'BATCH-1001',
            name: 'Solaris 2026 Bottled',
            stage: 'BOTTLED',
            quantity: 420,
            equipmentId: 'eq-bot-1',
            equipmentLabel: 'Bottling Line #1',
            createdAt: '2026-10-05T10:00:00.000Z',
            isSpoiled: false,
            yeastId: 'EC1118',
            description: '',
            sources: [],
            ingredients: [],
            nutrientsOverride: null,
        },
        {
            id: 'b-2',
            batchNumber: 'BATCH-1002',
            name: 'Experimental Must',
            stage: 'MUST',
            quantity: 80,
            equipmentId: 'eq-press-1',
            equipmentLabel: 'Press #1',
            createdAt: '2026-09-10T10:00:00.000Z',
            isSpoiled: true,
            yeastId: 'EC1118',
            description: '',
            sources: [],
            ingredients: [],
            nutrientsOverride: null,
        },
    ],
};

describe('reportCalculators', () => {
    it('computes production efficiency KPIs including yield/ha, days to bottling, and spoiled %', () => {
        const res = computeReportContent(
            {
                type: 'PRODUCTION_EFFICIENCY',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
            },
            sampleDataset,
        );

        expect(res.hasData).toBe(true);
        // 600 kg across 200 are (2 ha) => 300 kg/ha
        expect(res.kpis[0]?.value).toBe('300 kg/ha');
        // 2026-09-05 -> 2026-10-05 => 30 days
        expect(res.kpis[1]?.value).toBe('30 days');
        // 1 of 2 batches spoiled => 50%
        expect(res.kpis[2]?.value).toBe('50%');
        expect(res.rows).toHaveLength(2);
    });

    it('computes grapevine variety diversity and area shares', () => {
        const res = computeReportContent(
            {
                type: 'GRAPEVINE_DIVERSITY',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
            },
            sampleDataset,
        );

        expect(res.hasData).toBe(true);
        expect(res.kpis[0]?.value).toBe('2');
        expect(res.kpis[2]?.value).toBe('Solaris');
        expect(res.rows[0]?.col3).toContain('75%');
    });

    it('computes vineyard operations and historical trends, and detects empty periods', () => {
        const ops = computeReportContent(
            {
                type: 'VINEYARD_OPERATIONS',
                startDate: '2026-06-01',
                endDate: '2026-09-30',
            },
            sampleDataset,
        );
        expect(ops.hasData).toBe(true);
        expect(ops.kpis[0]?.value).toBe('4');

        const trends = computeReportContent(
            {
                type: 'HISTORICAL_TRENDS',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                aggregation: 'QUARTERLY',
            },
            sampleDataset,
        );
        expect(trends.hasData).toBe(true);
        expect(trends.rows.map((r) => r.col1)).toEqual(['2026-Q2', '2026-Q3', '2026-Q4']);

        const csv = formatReportAsCsv('Historical trend report', '2026-01-01', '2026-12-31', trends);
        expect(csv).toContain('2026-Q3');

        const empty = computeReportContent(
            {
                type: 'VINEYARD_OPERATIONS',
                startDate: '2020-01-01',
                endDate: '2020-12-31',
            },
            sampleDataset,
        );
        expect(empty.hasData).toBe(false);
    });
});

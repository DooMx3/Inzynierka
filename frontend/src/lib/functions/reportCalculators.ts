import type { ProductionBatch } from '$lib/api/batches';
import type { VineyardField } from '$lib/api/fields';
import type { HarvestRecord } from '$lib/api/harvests';
import type { PestObservation } from '$lib/api/pests';
import type { SprayingRecord } from '$lib/api/spraying';
import type { TaskItem } from '$lib/api/tasks';

export type ReportType =
    | 'PRODUCTION_EFFICIENCY'
    | 'GRAPEVINE_DIVERSITY'
    | 'VINEYARD_OPERATIONS'
    | 'HISTORICAL_TRENDS';

export type AggregationLevel = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
    PRODUCTION_EFFICIENCY: 'Production efficiency report',
    GRAPEVINE_DIVERSITY: 'Diversity of grapevine varieties',
    VINEYARD_OPERATIONS: 'Vineyard operations report',
    HISTORICAL_TRENDS: 'Historical trend report',
};

export const AGGREGATION_LABELS: Record<AggregationLevel, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
};

export type ReportKpi = {
    label: string;
    value: string;
    sublabel?: string;
};

export type ReportTableRow = {
    id: string;
    col1: string;
    col2: string;
    col3: string;
    col4: string;
};

export type ReportInputDataset = {
    fields: VineyardField[];
    harvests: HarvestRecord[];
    sprayings: SprayingRecord[];
    pests: PestObservation[];
    tasks: TaskItem[];
    batches: ProductionBatch[];
};

export type ReportParameters = {
    type: ReportType;
    startDate: string;
    endDate: string;
    batchFilterId?: string;
    fieldFilterId?: string;
    operationFilter?: 'ALL' | 'SPRAYING' | 'HARVEST' | 'PESTS' | 'TASKS';
    aggregation?: AggregationLevel;
};

export type ComputedReportContent = {
    hasData: boolean;
    summary: string;
    kpis: ReportKpi[];
    columns: [string, string, string, string];
    rows: ReportTableRow[];
};

const inDateRange = (isoDate: string | null | undefined, start: string, end: string): boolean => {
    if (!isoDate) {
        return false;
    }
    const day = isoDate.slice(0, 10);
    if (start && day < start) {
        return false;
    }
    if (end && day > end) {
        return false;
    }
    return true;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const bucketKeyForDate = (isoDate: string, level: AggregationLevel): string => {
    const day = isoDate.slice(0, 10);
    const [year = '2026', monthStr = '01'] = day.split('-');
    const month = Number(monthStr) || 1;
    if (level === 'YEARLY') {
        return year;
    }
    if (level === 'QUARTERLY') {
        const q = Math.floor((month - 1) / 3) + 1;
        return `${year}-Q${q}`;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
};

export const computeReportContent = (
    params: ReportParameters,
    dataset: ReportInputDataset,
): ComputedReportContent => {
    const { startDate, endDate } = params;

    const filteredHarvests = dataset.harvests.filter((h) => {
        if (!inDateRange(h.harvestDate, startDate, endDate)) {
            return false;
        }
        if (params.fieldFilterId) {
            return h.fields.some((f) => f.id === params.fieldFilterId);
        }
        return true;
    });

    const filteredBatches = dataset.batches.filter((b) => {
        if (!inDateRange(b.createdAt, startDate, endDate)) {
            return false;
        }
        if (params.batchFilterId) {
            return b.id === params.batchFilterId;
        }
        return true;
    });

    const filteredSprayings = dataset.sprayings.filter(
        (s) =>
            inDateRange(s.sprayingDate || s.due, startDate, endDate) &&
            (!params.fieldFilterId || s.fieldId === params.fieldFilterId),
    );

    const filteredPests = dataset.pests.filter(
        (p) =>
            inDateRange(p.observedAt, startDate, endDate) &&
            (!params.fieldFilterId || p.fieldId === params.fieldFilterId),
    );

    const filteredTasks = dataset.tasks.filter((t) => {
        const refDate = t.completedAt || t.dueDate || t.startedAt;
        if (refDate && !inDateRange(refDate, startDate, endDate)) {
            return false;
        }
        if (params.fieldFilterId && t.fieldId !== params.fieldFilterId) {
            return false;
        }
        return Boolean(refDate) || (!startDate && !endDate);
    });

    const activeFields = params.fieldFilterId
        ? dataset.fields.filter((f) => f.id === params.fieldFilterId)
        : dataset.fields;

    if (params.type === 'PRODUCTION_EFFICIENCY') {
        const hasData = filteredHarvests.length > 0 || filteredBatches.length > 0;
        const totalAreaHa = activeFields.reduce((acc, f) => acc + f.areaAre, 0) / 100;
        const totalHarvestKg = filteredHarvests.reduce((acc, h) => acc + h.amountKg, 0);
        const yieldPerHa = totalAreaHa > 0 ? round1(totalHarvestKg / totalAreaHa) : 0;

        const spoiledCount = filteredBatches.filter((b) => b.isSpoiled).length;
        const spoiledPct =
            filteredBatches.length > 0 ? round1((spoiledCount / filteredBatches.length) * 100) : 0;

        const bottledBatches = filteredBatches.filter((b) => b.stage === 'BOTTLED');
        const totalBottledLiters = bottledBatches.reduce((acc, b) => acc + b.quantity, 0);

        let totalDays = 0;
        let measuredPairs = 0;
        const earliestHarvestMs =
            filteredHarvests.length > 0
                ? Math.min(...filteredHarvests.map((h) => Date.parse(h.harvestDate)).filter(Number.isFinite))
                : NaN;

        for (const b of bottledBatches) {
            const bottledMs = Date.parse(b.createdAt);
            if (Number.isFinite(bottledMs) && Number.isFinite(earliestHarvestMs) && bottledMs >= earliestHarvestMs) {
                totalDays += Math.max(1, Math.round((bottledMs - earliestHarvestMs) / 86_400_000));
                measuredPairs += 1;
            }
        }
        const avgDaysToBottling = measuredPairs > 0 ? Math.round(totalDays / measuredPairs) : 0;

        return {
            hasData,
            summary: `Evaluated ${filteredHarvests.length} harvest(s) and ${filteredBatches.length} production batch(es) from ${startDate} to ${endDate}.`,
            kpis: [
                {
                    label: 'Yield per hectare',
                    value: totalAreaHa > 0 ? `${yieldPerHa} kg/ha` : `${totalHarvestKg} kg`,
                    sublabel: `${totalHarvestKg} kg across ${round1(totalAreaHa)} ha`,
                },
                {
                    label: 'Avg. harvest to bottling',
                    value: avgDaysToBottling > 0 ? `${avgDaysToBottling} days` : 'N/A',
                    sublabel: `${bottledBatches.length} bottled batch(es)`,
                },
                {
                    label: 'Spoiled batches',
                    value: `${spoiledPct}%`,
                    sublabel: `${spoiledCount} of ${filteredBatches.length} batch(es)`,
                },
                {
                    label: 'Bottled output',
                    value: `${round1(totalBottledLiters)} L`,
                    sublabel: 'Final packaged volume',
                },
            ],
            columns: ['Batch', 'Stage', 'Quantity', 'Status'],
            rows: filteredBatches.map((b) => ({
                id: b.id,
                col1: `${b.batchNumber} · ${b.name}`,
                col2: b.stage,
                col3: `${b.quantity} ${b.stage === 'MUST' ? 'kg' : 'L'}`,
                col4: b.isSpoiled ? 'Spoiled' : 'Healthy',
            })),
        };
    }

    if (params.type === 'GRAPEVINE_DIVERSITY') {
        const hasData = activeFields.length > 0 || filteredHarvests.length > 0;
        const totalAre = activeFields.reduce((acc, f) => acc + f.areaAre, 0);
        const totalHarvestKg = filteredHarvests.reduce((acc, h) => acc + h.amountKg, 0);

        const byVariety = new Map<
            string,
            { name: string; color: string; areaAre: number; harvestKg: number }
        >();

        for (const field of activeFields) {
            const key = field.grapeVarietyName;
            const prev = byVariety.get(key) ?? {
                name: key,
                color: field.grapeColor,
                areaAre: 0,
                harvestKg: 0,
            };
            prev.areaAre += field.areaAre;
            byVariety.set(key, prev);
        }

        for (const harvest of filteredHarvests) {
            const share = harvest.fields.length > 0 ? harvest.amountKg / harvest.fields.length : 0;
            for (const f of harvest.fields) {
                const key = f.grapeVarietyName;
                const prev = byVariety.get(key) ?? {
                    name: key,
                    color: f.grapeColor,
                    areaAre: f.areaAre,
                    harvestKg: 0,
                };
                prev.harvestKg += share;
                byVariety.set(key, prev);
            }
        }

        const varieties = [...byVariety.values()].sort((a, b) => b.areaAre - a.areaAre);
        const topVariety = varieties[0];

        return {
            hasData,
            summary: `Analysed ${varieties.length} grape variety group(s) across ${activeFields.length} vineyard parcel(s).`,
            kpis: [
                {
                    label: 'Planted varieties',
                    value: String(varieties.length),
                    sublabel: `${activeFields.length} active field(s)`,
                },
                {
                    label: 'Total planted area',
                    value: `${round1(totalAre)} ar`,
                    sublabel: `${round1(totalAre / 100)} ha`,
                },
                {
                    label: 'Dominant variety',
                    value: topVariety ? topVariety.name : 'N/A',
                    sublabel:
                        topVariety && totalAre > 0
                            ? `${round1((topVariety.areaAre / totalAre) * 100)}% of area`
                            : undefined,
                },
                {
                    label: 'Period harvest',
                    value: `${round1(totalHarvestKg)} kg`,
                    sublabel: `${filteredHarvests.length} harvest record(s)`,
                },
            ],
            columns: ['Variety', 'Color', 'Area (share)', 'Production contribution'],
            rows: varieties.map((v, idx) => ({
                id: `var-${idx}-${v.name}`,
                col1: v.name,
                col2: v.color === 'WHITE' ? 'White' : 'Red',
                col3: `${round1(v.areaAre)} ar (${totalAre > 0 ? round1((v.areaAre / totalAre) * 100) : 0}%)`,
                col4: `${round1(v.harvestKg)} kg (${totalHarvestKg > 0 ? round1((v.harvestKg / totalHarvestKg) * 100) : 0}%)`,
            })),
        };
    }

    if (params.type === 'VINEYARD_OPERATIONS') {
        const opFilter = params.operationFilter ?? 'ALL';
        const includeSpray = opFilter === 'ALL' || opFilter === 'SPRAYING';
        const includeHarvest = opFilter === 'ALL' || opFilter === 'HARVEST';
        const includePests = opFilter === 'ALL' || opFilter === 'PESTS';
        const includeTasks = opFilter === 'ALL' || opFilter === 'TASKS';

        const sprays = includeSpray ? filteredSprayings : [];
        const harvests = includeHarvest ? filteredHarvests : [];
        const pests = includePests ? filteredPests : [];
        const tasks = includeTasks ? filteredTasks : [];

        const totalOps = sprays.length + harvests.length + pests.length + tasks.length;
        const completedTasks = tasks.filter((t) => t.completed).length;
        const completionRate = tasks.length > 0 ? round1((completedTasks / tasks.length) * 100) : 100;
        const sprayLiters = sprays.reduce((acc, s) => acc + s.quantity, 0);

        return {
            hasData: totalOps > 0,
            summary: `Recorded ${totalOps} vineyard operation(s) between ${startDate} and ${endDate}.`,
            kpis: [
                {
                    label: 'Total operations',
                    value: String(totalOps),
                    sublabel: `Filter: ${opFilter}`,
                },
                {
                    label: 'Spraying treatments',
                    value: String(sprays.length),
                    sublabel: `${round1(sprayLiters)} L applied`,
                },
                {
                    label: 'Pest & disease alerts',
                    value: String(pests.length),
                    sublabel: 'Field observations',
                },
                {
                    label: 'Task completion rate',
                    value: `${completionRate}%`,
                    sublabel: `${completedTasks}/${tasks.length} tasks completed`,
                },
            ],
            columns: ['Operation category', 'Frequency', 'Key metric', 'Impact / status'],
            rows: [
                ...(includeSpray
                    ? [
                          {
                              id: 'op-spraying',
                              col1: 'Spraying treatments',
                              col2: `${sprays.length} event(s)`,
                              col3: `${round1(sprayLiters)} L total`,
                              col4: sprays.length > 0 ? 'Crop protection active' : 'None in period',
                          },
                      ]
                    : []),
                ...(includePests
                    ? [
                          {
                              id: 'op-pests',
                              col1: 'Pest & plant diseases',
                              col2: `${pests.length} observation(s)`,
                              col3: `${new Set(pests.map((p) => p.fieldId)).size} field(s) affected`,
                              col4: pests.length > 0 ? 'Requires monitoring' : 'Healthy canopy',
                          },
                      ]
                    : []),
                ...(includeHarvest
                    ? [
                          {
                              id: 'op-harvests',
                              col1: 'Grape harvests',
                              col2: `${harvests.length} harvest(s)`,
                              col3: `${harvests.reduce((a, h) => a + h.amountKg, 0)} kg collected`,
                              col4: harvests.length > 0 ? 'Supplying winery' : 'No harvest in period',
                          },
                      ]
                    : []),
                ...(includeTasks
                    ? [
                          {
                              id: 'op-tasks',
                              col1: 'Scheduled tasks',
                              col2: `${tasks.length} task(s)`,
                              col3: `${completedTasks} completed`,
                              col4: `${completionRate}% on-schedule completion`,
                          },
                      ]
                    : []),
            ],
        };
    }

    // HISTORICAL_TRENDS
    const level = params.aggregation ?? 'MONTHLY';
    const buckets = new Map<
        string,
        { harvestKg: number; batchesCount: number; operationsCount: number; spoiledCount: number }
    >();

    const touch = (key: string) => {
        const existing = buckets.get(key) ?? {
            harvestKg: 0,
            batchesCount: 0,
            operationsCount: 0,
            spoiledCount: 0,
        };
        buckets.set(key, existing);
        return existing;
    };

    for (const h of filteredHarvests) {
        const b = touch(bucketKeyForDate(h.harvestDate, level));
        b.harvestKg += h.amountKg;
        b.operationsCount += 1;
    }
    for (const s of filteredSprayings) {
        const dateStr = s.sprayingDate || s.due;
        if (dateStr) {
            touch(bucketKeyForDate(dateStr, level)).operationsCount += 1;
        }
    }
    for (const p of filteredPests) {
        touch(bucketKeyForDate(p.observedAt, level)).operationsCount += 1;
    }
    for (const t of filteredTasks) {
        const dateStr = t.completedAt || t.dueDate || t.startedAt;
        if (dateStr) {
            touch(bucketKeyForDate(dateStr, level)).operationsCount += 1;
        }
    }
    for (const batch of filteredBatches) {
        const b = touch(bucketKeyForDate(batch.createdAt, level));
        b.batchesCount += 1;
        if (batch.isSpoiled) {
            b.spoiledCount += 1;
        }
    }

    const sortedKeys = [...buckets.keys()].sort();
    const totalHarvestKg = filteredHarvests.reduce((a, h) => a + h.amountKg, 0);

    return {
        hasData: sortedKeys.length > 0,
        summary: `Aggregated ${sortedKeys.length} ${AGGREGATION_LABELS[level].toLowerCase()} period(s) from ${startDate} to ${endDate}.`,
        kpis: [
            {
                label: 'Aggregation level',
                value: AGGREGATION_LABELS[level],
                sublabel: `${sortedKeys.length} active interval(s)`,
            },
            {
                label: 'Cumulative harvest',
                value: `${round1(totalHarvestKg)} kg`,
                sublabel:
                    sortedKeys.length > 0
                        ? `Avg ${round1(totalHarvestKg / sortedKeys.length)} kg / period`
                        : undefined,
            },
            {
                label: 'Production batches',
                value: String(filteredBatches.length),
                sublabel: `${filteredBatches.filter((b) => b.isSpoiled).length} spoiled`,
            },
            {
                label: 'Recorded operations',
                value: String(
                    filteredHarvests.length +
                        filteredSprayings.length +
                        filteredPests.length +
                        filteredTasks.length,
                ),
                sublabel: 'Field & winery activities',
            },
        ],
        columns: ['Period', 'Harvested grapes', 'Batches started', 'Operations logged'],
        rows: sortedKeys.map((key) => {
            const item = buckets.get(key)!;
            return {
                id: `trend-${key}`,
                col1: key,
                col2: `${round1(item.harvestKg)} kg`,
                col3: `${item.batchesCount} (${item.spoiledCount} spoiled)`,
                col4: `${item.operationsCount} operation(s)`,
            };
        }),
    };
};

const escapeCsv = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

export const formatReportAsCsv = (
    title: string,
    startDate: string,
    endDate: string,
    content: ComputedReportContent,
): string => {
    const lines: string[] = [
        ['Report', title].map(escapeCsv).join(','),
        ['Period', `${startDate} to ${endDate}`].map(escapeCsv).join(','),
        '',
        'Metric,Value,Notes',
        ...content.kpis.map((kpi) =>
            [kpi.label, kpi.value, kpi.sublabel ?? ''].map(escapeCsv).join(','),
        ),
        '',
        content.columns.map(escapeCsv).join(','),
        ...content.rows.map((row) =>
            [row.col1, row.col2, row.col3, row.col4].map(escapeCsv).join(','),
        ),
    ];
    return lines.join('\n');
};

import { getBatches } from '$lib/api/batches';
import { getFields } from '$lib/api/fields';
import { getHarvests } from '$lib/api/harvests';
import { getPestObservations } from '$lib/api/pests';
import { getSprayings } from '$lib/api/spraying';
import { getTasks } from '$lib/api/tasks';
import {
    computeReportContent,
    REPORT_TYPE_LABELS,
    type ComputedReportContent,
    type ReportParameters,
    type ReportType,
} from '$lib/functions/reportCalculators';

const STORAGE_KEY = 'wms_generated_reports_v1';

export type SavedReport = {
    id: string;
    title: string;
    type: ReportType;
    startDate: string;
    endDate: string;
    createdAt: string;
    parameters: ReportParameters;
    content: ComputedReportContent;
    emailQueuedTo: string | null;
};

export class EmptyReportPeriodError extends Error {
    constructor(message = 'No vineyard or production data was found for the selected time period.') {
        super(message);
        this.name = 'EmptyReportPeriodError';
    }
}

const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStore = (): SavedReport[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as SavedReport[]) : [];
    } catch {
        return [];
    }
};

const writeStore = (reports: SavedReport[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    }
};

export const getSavedReports = (): SavedReport[] =>
    readStore().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const deleteSavedReport = (id: string): void => {
    writeStore(readStore().filter((item) => item.id !== id));
};

export const generateReport = async (
    params: ReportParameters,
    ownerEmail?: string | null,
): Promise<SavedReport> => {
    if (!params.startDate || !params.endDate) {
        throw new Error('Select both start date and end date.');
    }
    if (params.startDate > params.endDate) {
        throw new Error('Start date cannot be later than end date.');
    }

    const [fields, harvests, sprayings, pests, tasks, batches] = await Promise.all([
        params.type === 'GRAPEVINE_DIVERSITY' || params.type === 'PRODUCTION_EFFICIENCY'
            ? getFields().catch(() => [])
            : getFields().catch(() => []),
        getHarvests().catch(() => []),
        getSprayings().catch(() => []),
        getPestObservations().catch(() => []),
        getTasks().catch(() => []),
        getBatches().catch(() => []),
    ]);

    const content = computeReportContent(params, {
        fields,
        harvests,
        sprayings,
        pests,
        tasks,
        batches,
    });

    if (!content.hasData) {
        throw new EmptyReportPeriodError();
    }

    const report: SavedReport = {
        id: makeId(),
        title: REPORT_TYPE_LABELS[params.type],
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
        createdAt: new Date().toISOString(),
        parameters: params,
        content,
        emailQueuedTo: ownerEmail?.trim() || null,
    };

    const existing = readStore();
    writeStore([report, ...existing]);
    return report;
};

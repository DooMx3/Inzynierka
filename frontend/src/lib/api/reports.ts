import { apiFetch, toApiError } from '$lib/api/auth';
import { getBatches } from '$lib/api/batches';
import { getFields } from '$lib/api/fields';
import { getHarvests } from '$lib/api/harvests';
import { getPestObservations } from '$lib/api/pests';
import { getSprayings } from '$lib/api/spraying';
import { getTasks } from '$lib/api/tasks';
import {
    computeReportContent,
    REPORT_TYPE_LABELS,
    type AggregationLevel,
    type ComputedReportContent,
    type ReportParameters,
    type ReportType,
} from '$lib/functions/reportCalculators';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

const STORAGE_KEY = 'wms_generated_reports_v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SavedReport = {
    id: string;
    title: string;
    type: ReportType;
    startDate: string;
    endDate: string;
    createdAt: string;
    parameters: ReportParameters;
    content: ComputedReportContent;
    serverHtml?: string | null;
    emailQueuedTo: string | null;
};

export type ServerReportRequestPayload = {
    fromDate: string;
    toDate: string;
    batchIds: string[];
    fieldIds: string[];
    operationIds: string[];
    aggregation: AggregationLevel;
};

export class EmptyReportPeriodError extends Error {
    constructor(message = 'No vineyard or production data was found for the selected time period.') {
        super(message);
        this.name = 'EmptyReportPeriodError';
    }
}

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

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

export const buildServerReportRequest = (
    params: ReportParameters,
): ServerReportRequestPayload => ({
    fromDate: params.startDate,
    toDate: params.endDate,
    batchIds:
        params.batchFilterId && UUID_RE.test(params.batchFilterId) ? [params.batchFilterId] : [],
    fieldIds:
        params.fieldFilterId && UUID_RE.test(params.fieldFilterId) ? [params.fieldFilterId] : [],
    operationIds: [],
    aggregation: params.aggregation ?? 'MONTHLY',
});

export const fetchServerReportHtml = async (params: ReportParameters): Promise<string | null> => {
    try {
        const response = await apiFetch(`/api/reports/${encodeURIComponent(params.type)}`, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(buildServerReportRequest(params)),
        });
        if (!response.ok) {
            return null;
        }
        const contentType = response.headers.get('content-type') ?? '';
        const text = await response.text();
        if (contentType.includes('text/html') || text.trimStart().startsWith('<')) {
            return text;
        }
        return null;
    } catch {
        return null;
    }
};

export const fetchServerReportPdf = async (params: ReportParameters): Promise<Blob> => {
    const response = await apiFetch(`/api/reports/${encodeURIComponent(params.type)}/pdf`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(buildServerReportRequest(params)),
    });
    await ensureOk(response);
    return response.blob();
};

export const downloadServerReportPdf = async (
    params: ReportParameters,
    customFilename?: string,
): Promise<void> => {
    const pdfBlob = await fetchServerReportPdf(params);
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    const slug = params.type.toLowerCase().replace(/_/g, '-');
    anchor.href = url;
    anchor.download = customFilename || `${slug}-${params.startDate}-to-${params.endDate}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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

    const [fields, harvests, sprayings, pests, tasks, batches, serverHtml] = await Promise.all([
        getFields().catch(() => []),
        getHarvests().catch(() => []),
        getSprayings().catch(() => []),
        getPestObservations().catch(() => []),
        getTasks().catch(() => []),
        getBatches().catch(() => []),
        fetchServerReportHtml(params),
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
        parameters: {
            ...params,
            aggregation: params.aggregation ?? 'MONTHLY',
        },
        content,
        serverHtml,
        emailQueuedTo: ownerEmail?.trim() || null,
    };

    const existing = readStore();
    writeStore([report, ...existing]);
    return report;
};

import { ApiError, apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

const FALLBACK_STORAGE_KEY = 'wms_chemical_parameters_v1';

export type ChemicalParameterRecord = {
    id: string;
    batchId: string;
    recordedAt: string;
    sugarLevel: number | null;
    acidity: number | null;
    pH: number | null;
    temperature: number | null;
    alcoholContent: number | null;
};

export type ChemicalParameterDraft = {
    sugarLevel?: number | null;
    acidity?: number | null;
    pH?: number | null;
    temperature?: number | null;
    alcoholContent?: number | null;
    recordedAt?: string;
};

const makeLocalId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `param-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readFallbackStore = (): ChemicalParameterRecord[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }
    try {
        const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChemicalParameterRecord[]) : [];
    } catch {
        return [];
    }
};

const writeFallbackStore = (records: ChemicalParameterRecord[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(records));
    }
};

const isOfflineOrMissingEndpoint = (error: unknown): boolean => {
    if (error instanceof ApiError) {
        return error.status === 404 || error.status === 401 || error.status === 403;
    }
    if (error instanceof TypeError) {
        return true;
    }
    if (error && typeof error === 'object') {
        const name = (error as { name?: unknown }).name;
        const code = (error as { code?: unknown }).code;
        if (name === 'NetworkError' || name === 'AbortError' || code === 'ECONNREFUSED') {
            return true;
        }
    }
    return false;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const toNullableNumber = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') {
        return null;
    }
    const parsed = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.round(parsed * 100) / 100;
};

const toIsoInstantOrUndefined = (input?: string): string | undefined => {
    const trimmed = input?.trim();
    if (!trimmed) {
        return undefined;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export const validateChemicalParameterDraft = (draft: ChemicalParameterDraft): string | null => {
    const sugarLevel = toNullableNumber(draft.sugarLevel);
    const acidity = toNullableNumber(draft.acidity);
    const pH = toNullableNumber(draft.pH);
    const temperature = toNullableNumber(draft.temperature);
    const alcoholContent = toNullableNumber(draft.alcoholContent);

    if (
        sugarLevel === null &&
        acidity === null &&
        pH === null &&
        temperature === null &&
        alcoholContent === null
    ) {
        return 'Enter at least one chemical parameter reading.';
    }
    if (sugarLevel !== null && sugarLevel < 0) {
        return 'Sugar level cannot be negative.';
    }
    if (acidity !== null && acidity < 0) {
        return 'Acidity cannot be negative.';
    }
    if (pH !== null && (pH < 2.5 || pH > 4.5)) {
        return 'pH must be between 2.5 and 4.5.';
    }
    if (alcoholContent !== null && (alcoholContent < 0 || alcoholContent > 22)) {
        return 'Alcohol content must be between 0% and 22%.';
    }
    return null;
};

export const readParameterRecord = (data: unknown): ChemicalParameterRecord => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        batchId: typeof record.batchId === 'string' ? record.batchId : '',
        recordedAt: typeof record.recordedAt === 'string' ? record.recordedAt : '',
        sugarLevel: toNullableNumber(record.sugarLevel),
        acidity: toNullableNumber(record.acidity),
        pH: toNullableNumber(record.pH ?? record.ph),
        temperature: toNullableNumber(record.temperature),
        alcoholContent: toNullableNumber(record.alcoholContent),
    };
};

const serializeDraft = (draft: ChemicalParameterDraft) => {
    const validationError = validateChemicalParameterDraft(draft);
    if (validationError) {
        throw new Error(validationError);
    }

    return JSON.stringify({
        recordedAt: toIsoInstantOrUndefined(draft.recordedAt),
        sugarLevel: toNullableNumber(draft.sugarLevel),
        acidity: toNullableNumber(draft.acidity),
        pH: toNullableNumber(draft.pH),
        temperature: toNullableNumber(draft.temperature),
        alcoholContent: toNullableNumber(draft.alcoholContent),
    });
};

export const getBatchParameters = async (batchId: string): Promise<ChemicalParameterRecord[]> => {
    try {
        const response = await apiFetch(
            `/api/batches/${encodeURIComponent(batchId)}/records`,
            {
                method: 'GET',
            },
        );
        await ensureOk(response);
        const data: unknown = await response.json();
        const remote = Array.isArray(data)
            ? data.map(readParameterRecord).filter((item) => Boolean(item.id))
            : [];
        const local = readFallbackStore().filter((item) => item.batchId === batchId);
        const seen = new Set(remote.map((r) => r.id));
        return [...remote, ...local.filter((l) => !seen.has(l.id))].sort((a, b) =>
            b.recordedAt.localeCompare(a.recordedAt),
        );
    } catch (error) {
        if (isOfflineOrMissingEndpoint(error)) {
            return readFallbackStore()
                .filter((record) => record.batchId === batchId)
                .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        }
        throw error;
    }
};

export const getAllParameters = async (batchIds?: string[]): Promise<ChemicalParameterRecord[]> => {
    let targetIds = batchIds ? [...new Set(batchIds.filter(Boolean))] : undefined;

    if (!targetIds) {
        try {
            const response = await apiFetch('/api/batches', { method: 'GET' });
            if (response.ok) {
                const data: unknown = await response.json();
                if (Array.isArray(data)) {
                    targetIds = data
                        .map((item) =>
                            item && typeof item === 'object'
                                ? (item as Record<string, unknown>).id
                                : undefined,
                        )
                        .filter((id): id is string => typeof id === 'string' && id.length > 0);
                }
            }
        } catch {
            targetIds = undefined;
        }
    }

    const localAll = readFallbackStore();
    if (!targetIds || targetIds.length === 0) {
        return [...localAll].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    }

    const perBatch = await Promise.all(
        targetIds.map((id) => getBatchParameters(id).catch(() => [])),
    );
    const remoteFlat = perBatch.flat();
    const seen = new Set(remoteFlat.map((r) => r.id));
    return [...remoteFlat, ...localAll.filter((l) => !seen.has(l.id))].sort((a, b) =>
        b.recordedAt.localeCompare(a.recordedAt),
    );
};

export const createBatchParameter = async (
    batchId: string,
    draft: ChemicalParameterDraft,
): Promise<ChemicalParameterRecord> => {
    const body = serializeDraft(draft);
    try {
        const response = await apiFetch(
            `/api/batches/${encodeURIComponent(batchId)}/records`,
            {
                method: 'POST',
                headers: jsonHeaders,
                body,
            },
        );
        await ensureOk(response);
        return readParameterRecord(await response.json());
    } catch (error) {
        if (isOfflineOrMissingEndpoint(error)) {
            const records = readFallbackStore();
            const created: ChemicalParameterRecord = {
                id: makeLocalId(),
                batchId,
                recordedAt: toIsoInstantOrUndefined(draft.recordedAt) ?? new Date().toISOString(),
                sugarLevel: toNullableNumber(draft.sugarLevel),
                acidity: toNullableNumber(draft.acidity),
                pH: toNullableNumber(draft.pH),
                temperature: toNullableNumber(draft.temperature),
                alcoholContent: toNullableNumber(draft.alcoholContent),
            };
            writeFallbackStore([created, ...records]);
            return created;
        }
        throw error;
    }
};

export async function updateBatchParameter(
    batchId: string,
    recordId: string,
    draft: ChemicalParameterDraft,
): Promise<ChemicalParameterRecord>;
export async function updateBatchParameter(
    recordId: string,
    draft: ChemicalParameterDraft,
    batchId?: string,
): Promise<ChemicalParameterRecord>;
export async function updateBatchParameter(
    arg1: string,
    arg2: string | ChemicalParameterDraft,
    arg3?: ChemicalParameterDraft | string,
): Promise<ChemicalParameterRecord> {
    const isThreeArgStringSecond = typeof arg2 === 'string';
    const recordId = isThreeArgStringSecond ? arg2 : arg1;
    const draft = (isThreeArgStringSecond ? arg3 : arg2) as ChemicalParameterDraft;
    let batchId = isThreeArgStringSecond
        ? arg1
        : typeof arg3 === 'string'
          ? arg3
          : undefined;

    const body = serializeDraft(draft);

    if (!batchId) {
        batchId = readFallbackStore().find((r) => r.id === recordId)?.batchId;
    }

    if (batchId) {
        try {
            const response = await apiFetch(
                `/api/batches/${encodeURIComponent(batchId)}/records/${encodeURIComponent(recordId)}`,
                {
                    method: 'PUT',
                    headers: jsonHeaders,
                    body,
                },
            );
            await ensureOk(response);
            return readParameterRecord(await response.json());
        } catch (error) {
            if (!isOfflineOrMissingEndpoint(error)) {
                throw error;
            }
        }
    }

    const records = readFallbackStore();
    const existing = records.find((item) => item.id === recordId);
    if (!existing) {
        throw new Error('Parameter record not found.');
    }
    const updated: ChemicalParameterRecord = {
        ...existing,
        recordedAt: toIsoInstantOrUndefined(draft.recordedAt) ?? existing.recordedAt,
        sugarLevel: toNullableNumber(draft.sugarLevel),
        acidity: toNullableNumber(draft.acidity),
        pH: toNullableNumber(draft.pH),
        temperature: toNullableNumber(draft.temperature),
        alcoholContent: toNullableNumber(draft.alcoholContent),
    };
    writeFallbackStore(records.map((item) => (item.id === recordId ? updated : item)));
    return updated;
}

export const deleteBatchParameter = async (
    batchIdOrRecordId: string,
    maybeRecordId?: string,
): Promise<void> => {
    const hasBoth = typeof maybeRecordId === 'string' && maybeRecordId.length > 0;
    const batchId = hasBoth
        ? batchIdOrRecordId
        : readFallbackStore().find((r) => r.id === batchIdOrRecordId)?.batchId;
    const recordId = hasBoth ? maybeRecordId : batchIdOrRecordId;

    if (batchId) {
        try {
            const response = await apiFetch(
                `/api/batches/${encodeURIComponent(batchId)}/records/${encodeURIComponent(recordId)}`,
                {
                    method: 'DELETE',
                },
            );
            await ensureOk(response);
        } catch (error) {
            if (!isOfflineOrMissingEndpoint(error)) {
                throw error;
            }
        }
    }

    const records = readFallbackStore();
    if (records.some((item) => item.id === recordId)) {
        writeFallbackStore(records.filter((item) => item.id !== recordId));
    }
};

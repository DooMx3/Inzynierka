import { apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type SprayingRecord = {
    id: string;
    fieldId: string;
    equipmentId: string;
    substanceId: string;
    sprayingDate: string;
    quantity: number;
    due: string;
};

export type SprayingDraft = {
    fieldId: string;
    equipmentId: string;
    substanceId: string;
    sprayingDate?: string | null;
    quantity: number;
    due?: string | null;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

export const toNullableIsoDateTime = (input?: string | null): string | null => {
    const trimmed = input?.trim() ?? '';
    if (!trimmed) {
        return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return `${trimmed}T12:00:00.000Z`;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
};

export const toIsoDateTime = (input: string): string =>
    toNullableIsoDateTime(input) ?? new Date().toISOString();

export const toDateInputValue = (iso?: string | null): string => {
    if (!iso) {
        return '';
    }
    return iso.slice(0, 10);
};

const readSpraying = (data: unknown): SprayingRecord => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        fieldId: typeof record.fieldId === 'string' ? record.fieldId : '',
        equipmentId: typeof record.equipmentId === 'string' ? record.equipmentId : '',
        substanceId: typeof record.substanceId === 'string' ? record.substanceId : '',
        sprayingDate: typeof record.sprayingDate === 'string' ? record.sprayingDate : '',
        quantity: typeof record.quantity === 'number' ? record.quantity : Number(record.quantity) || 0,
        due: typeof record.due === 'string' ? record.due : '',
    };
};

const serializeDraft = (draft: SprayingDraft, planned = false) => {
    const sprayingDate = planned
        ? null
        : toNullableIsoDateTime(draft.sprayingDate);
    const due = toNullableIsoDateTime(draft.due);

    return JSON.stringify({
        fieldId: draft.fieldId,
        equipmentId: draft.equipmentId,
        substanceId: draft.substanceId,
        sprayingDate,
        quantity: Math.round(draft.quantity),
        due,
    });
};

export const getPlannedSprayingIds = (): Set<string> => new Set();

export const isPlannedSpraying = (
    record: SprayingRecord,
    plannedIds?: Set<string>,
    now: Date = new Date(),
): boolean => {
    if (!record.sprayingDate || !record.sprayingDate.trim()) {
        return true;
    }
    if (plannedIds?.has(record.id)) {
        return true;
    }
    const sprayTime = Date.parse(record.sprayingDate);
    if (!Number.isNaN(sprayTime) && sprayTime > now.getTime()) {
        return true;
    }
    return false;
};

export const getSprayings = async (): Promise<SprayingRecord[]> => {
    const response = await apiFetch('/api/spraying', {
        method: 'GET',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readSpraying).filter((item) => Boolean(item.id));
};

export const createSpraying = async (
    draft: SprayingDraft,
    planned = false,
): Promise<SprayingRecord> => {
    const response = await apiFetch('/api/spraying', {
        method: 'POST',
        headers: jsonHeaders,
        body: serializeDraft(draft, planned),
    });
    await ensureOk(response);
    return readSpraying(await response.json());
};

export const updateSpraying = async (
    id: string,
    draft: SprayingDraft,
    planned = false,
): Promise<SprayingRecord> => {
    const response = await apiFetch(`/api/spraying/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: serializeDraft(draft, planned),
    });
    await ensureOk(response);
    return readSpraying(await response.json());
};

export const deleteSpraying = async (id: string): Promise<void> => {
    const response = await apiFetch(`/api/spraying/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    await ensureOk(response);
};

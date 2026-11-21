import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

const PLANNED_STORAGE_KEY = 'wms_planned_spraying_ids';

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
    sprayingDate: string;
    quantity: number;
    due: string;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

export const toIsoDateTime = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) {
        return new Date().toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return `${trimmed}T12:00:00.000Z`;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
};

export const toDateInputValue = (iso: string): string => {
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

const serializeDraft = (draft: SprayingDraft) =>
    JSON.stringify({
        fieldId: draft.fieldId,
        equipmentId: draft.equipmentId,
        substanceId: draft.substanceId,
        sprayingDate: toIsoDateTime(draft.sprayingDate),
        quantity: Math.round(draft.quantity),
        due: toIsoDateTime(draft.due),
    });

export const getPlannedSprayingIds = (): Set<string> => {
    if (typeof localStorage === 'undefined') {
        return new Set();
    }
    try {
        const raw = localStorage.getItem(PLANNED_STORAGE_KEY);
        if (!raw) {
            return new Set();
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed)
            ? new Set(parsed.filter((item): item is string => typeof item === 'string'))
            : new Set();
    } catch {
        return new Set();
    }
};

export const markSprayingAsPlannedLocal = (id: string, planned: boolean): void => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    const ids = getPlannedSprayingIds();
    if (planned) {
        ids.add(id);
    } else {
        ids.delete(id);
    }
    localStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify([...ids]));
};

export const isPlannedSpraying = (
    record: SprayingRecord,
    plannedIds: Set<string> = getPlannedSprayingIds(),
    now: Date = new Date(),
): boolean => {
    if (plannedIds.has(record.id)) {
        return true;
    }
    const sprayTime = Date.parse(record.sprayingDate);
    if (!Number.isNaN(sprayTime) && sprayTime > now.getTime()) {
        return true;
    }
    return false;
};

export const getSprayings = async (): Promise<SprayingRecord[]> => {
    const response = await fetch('/api/spraying', {
        method: 'GET',
        credentials: 'include',
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
    const response = await fetch('/api/spraying', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    const created = readSpraying(await response.json());
    if (created.id) {
        markSprayingAsPlannedLocal(created.id, planned);
    }
    return created;
};

export const updateSpraying = async (
    id: string,
    draft: SprayingDraft,
    planned = false,
): Promise<SprayingRecord> => {
    const response = await fetch(`/api/spraying/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    const updated = readSpraying(await response.json());
    markSprayingAsPlannedLocal(id, planned);
    return updated;
};

export const deleteSpraying = async (id: string): Promise<void> => {
    const response = await fetch(`/api/spraying/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
    markSprayingAsPlannedLocal(id, false);
};

import { toApiError } from '$lib/api/auth';
import { readField, type VineyardField } from '$lib/api/fields';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type HarvestRecord = {
    id: string;
    fields: VineyardField[];
    amountKg: number;
    harvestDate: string;
    active: boolean;
};

export type HarvestDraft = {
    fieldIds: string[];
    amountKg: number;
    harvestDate: string;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readHarvest = (data: unknown): HarvestRecord => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const fields = Array.isArray(record.fields)
        ? record.fields.map(readField).filter((item) => Boolean(item.id))
        : [];
    return {
        id: typeof record.id === 'string' ? record.id : '',
        fields,
        amountKg:
            typeof record.amountKg === 'number' ? record.amountKg : Number(record.amountKg) || 0,
        harvestDate: typeof record.harvestDate === 'string' ? record.harvestDate : '',
        active: typeof record.active === 'boolean' ? record.active : true,
    };
};

const serializeDraft = (draft: HarvestDraft) =>
    JSON.stringify({
        fieldIds: [...new Set(draft.fieldIds)],
        amountKg: Math.round(draft.amountKg),
        harvestDate: draft.harvestDate,
    });

export const getHarvests = async (fieldId?: string): Promise<HarvestRecord[]> => {
    const url = fieldId
        ? `/api/harvests?fieldId=${encodeURIComponent(fieldId)}`
        : '/api/harvests';
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readHarvest).filter((item) => Boolean(item.id));
};

export const createHarvest = async (draft: HarvestDraft): Promise<HarvestRecord> => {
    const response = await fetch('/api/harvests', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readHarvest(await response.json());
};

export const updateHarvest = async (id: string, draft: HarvestDraft): Promise<HarvestRecord> => {
    const response = await fetch(`/api/harvests/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readHarvest(await response.json());
};

export const deleteHarvest = async (id: string): Promise<void> => {
    const response = await fetch(`/api/harvests/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

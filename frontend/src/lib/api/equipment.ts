import { apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type Equipment = {
    id: string;
    name: string;
    type: string;
    endOfTechnicalInspection: string | null;
    active: boolean;
};

export type EquipmentDraft = {
    name: string;
    type: string;
    endOfTechnicalInspection?: string | null;
};

export const EQUIPMENT_TYPE_PRESETS = [
    'Fermentor',
    'Barrel',
    'Press',
    'Mixer',
    'Bottling line',
    'Sprayer',
    'Tractor',
    'Tank',
    'Other',
] as const;

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readEquipment = (data: unknown): Equipment => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        name: typeof record.name === 'string' ? record.name : '',
        type: typeof record.type === 'string' ? record.type : '',
        endOfTechnicalInspection:
            typeof record.endOfTechnicalInspection === 'string' && record.endOfTechnicalInspection
                ? record.endOfTechnicalInspection
                : null,
        active: typeof record.active === 'boolean' ? record.active : true,
    };
};

const serializeDraft = (draft: EquipmentDraft) =>
    JSON.stringify({
        name: draft.name.trim(),
        type: draft.type.trim(),
        endOfTechnicalInspection: draft.endOfTechnicalInspection?.trim() || undefined,
    });

export const getEquipmentList = async (): Promise<Equipment[]> => {
    const response = await apiFetch('/api/equipment', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readEquipment).filter((item) => Boolean(item.id));
};

export const getEquipmentById = async (id: string): Promise<Equipment> => {
    const response = await apiFetch(`/api/equipment/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    return readEquipment(await response.json());
};

export const createEquipment = async (draft: EquipmentDraft): Promise<Equipment> => {
    const response = await apiFetch('/api/equipment', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readEquipment(await response.json());
};

export const updateEquipment = async (id: string, draft: EquipmentDraft): Promise<Equipment> => {
    const response = await apiFetch(`/api/equipment/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readEquipment(await response.json());
};

export const deleteEquipment = async (id: string): Promise<void> => {
    const response = await apiFetch(`/api/equipment/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

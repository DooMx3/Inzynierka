import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type PestObservationType = 'PEST' | 'DISEASE';

export type PestObservation = {
    id: string;
    fieldId: string;
    type: PestObservationType;
    name: string;
    observedAt: string;
    description: string;
    active: boolean;
};

export type PestObservationDraft = {
    fieldId: string;
    type: PestObservationType;
    name: string;
    observedAt: string;
    description?: string;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readObservation = (data: unknown): PestObservation => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        fieldId: typeof record.fieldId === 'string' ? record.fieldId : '',
        type: record.type === 'DISEASE' ? 'DISEASE' : 'PEST',
        name: typeof record.name === 'string' ? record.name : '',
        observedAt: typeof record.observedAt === 'string' ? record.observedAt : '',
        description: typeof record.description === 'string' ? record.description : '',
        active: typeof record.active === 'boolean' ? record.active : true,
    };
};

const serializeDraft = (draft: PestObservationDraft) =>
    JSON.stringify({
        fieldId: draft.fieldId,
        type: draft.type,
        name: draft.name.trim(),
        observedAt: draft.observedAt,
        description: draft.description?.trim() || undefined,
    });

export const getPestObservations = async (fieldId?: string): Promise<PestObservation[]> => {
    const url = fieldId
        ? `/api/pest-observations?fieldId=${encodeURIComponent(fieldId)}`
        : '/api/pest-observations';
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readObservation).filter((item) => Boolean(item.id));
};

export const createPestObservation = async (
    draft: PestObservationDraft,
): Promise<PestObservation> => {
    const response = await fetch('/api/pest-observations', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readObservation(await response.json());
};

export const updatePestObservation = async (
    id: string,
    draft: PestObservationDraft,
): Promise<PestObservation> => {
    const response = await fetch(`/api/pest-observations/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readObservation(await response.json());
};

export const deletePestObservation = async (id: string): Promise<void> => {
    const response = await fetch(`/api/pest-observations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

import { apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type Substance = {
    id: string;
    name: string;
    active: boolean;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readSubstance = (data: unknown): Substance => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        name: typeof record.name === 'string' ? record.name : '',
        active: typeof record.active === 'boolean' ? record.active : true,
    };
};

export const getSubstances = async (): Promise<Substance[]> => {
    const response = await apiFetch('/api/substances', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readSubstance).filter((item) => Boolean(item.id));
};

export const createSubstance = async (name: string): Promise<Substance> => {
    const response = await apiFetch('/api/substances', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ name: name.trim() }),
    });
    await ensureOk(response);
    return readSubstance(await response.json());
};

export const updateSubstance = async (id: string, name: string): Promise<Substance> => {
    const response = await apiFetch(`/api/substances/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ name: name.trim() }),
    });
    await ensureOk(response);
    return readSubstance(await response.json());
};

export const patchSubstance = async (id: string, name: string): Promise<Substance> => {
    const response = await apiFetch(`/api/substances/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ name: name.trim() }),
    });
    await ensureOk(response);
    return readSubstance(await response.json());
};

export const deleteSubstance = async (id: string): Promise<void> => {
    const response = await apiFetch(`/api/substances/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

import { apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type GrapeColor = 'RED' | 'WHITE';

export type GrapeVariety =
    | 'SOLARIS'
    | 'REGENT'
    | 'RONDO'
    | 'JOHANNITER'
    | 'SEYVAL_BLANC'
    | 'MUSCARIS'
    | 'CABERNET_CORTIS'
    | 'HIBERNAL'
    | 'RIESLING'
    | 'CHARDONNAY'
    | 'PINOT_NOIR'
    | 'MERLOT'
    | 'OTHER';

export type GrapeVarietyOption = {
    value: GrapeVariety;
    label: string;
    requiresCustomName: boolean;
};

export type VineyardField = {
    id: string;
    areaAre: number;
    grapeVariety: GrapeVariety;
    grapeVarietyName: string;
    grapeColor: GrapeColor;
    active: boolean;
};

export type FieldDraft = {
    areaAre: number;
    grapeVariety: GrapeVariety;
    otherGrapeVariety?: string;
    grapeColor: GrapeColor;
};

export const DEFAULT_GRAPE_VARIETIES: GrapeVarietyOption[] = [
    { value: 'SOLARIS', label: 'Solaris', requiresCustomName: false },
    { value: 'REGENT', label: 'Regent', requiresCustomName: false },
    { value: 'RONDO', label: 'Rondo', requiresCustomName: false },
    { value: 'JOHANNITER', label: 'Johanniter', requiresCustomName: false },
    { value: 'SEYVAL_BLANC', label: 'Seyval Blanc', requiresCustomName: false },
    { value: 'MUSCARIS', label: 'Muscaris', requiresCustomName: false },
    { value: 'CABERNET_CORTIS', label: 'Cabernet Cortis', requiresCustomName: false },
    { value: 'HIBERNAL', label: 'Hibernal', requiresCustomName: false },
    { value: 'RIESLING', label: 'Riesling', requiresCustomName: false },
    { value: 'CHARDONNAY', label: 'Chardonnay', requiresCustomName: false },
    { value: 'PINOT_NOIR', label: 'Pinot Noir', requiresCustomName: false },
    { value: 'MERLOT', label: 'Merlot', requiresCustomName: false },
    { value: 'OTHER', label: 'Other', requiresCustomName: true },
];

export const DEFAULT_GRAPE_COLORS: GrapeColor[] = ['RED', 'WHITE'];

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

export const readField = (data: unknown): VineyardField => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const grapeVariety =
        typeof record.grapeVariety === 'string' ? (record.grapeVariety as GrapeVariety) : 'OTHER';
    const fallbackLabel =
        DEFAULT_GRAPE_VARIETIES.find((item) => item.value === grapeVariety)?.label ?? grapeVariety;

    return {
        id: typeof record.id === 'string' ? record.id : '',
        areaAre: typeof record.areaAre === 'number' ? record.areaAre : Number(record.areaAre) || 0,
        grapeVariety,
        grapeVarietyName:
            typeof record.grapeVarietyName === 'string' && record.grapeVarietyName
                ? record.grapeVarietyName
                : fallbackLabel,
        grapeColor: record.grapeColor === 'WHITE' ? 'WHITE' : 'RED',
        active: typeof record.active === 'boolean' ? record.active : true,
    };
};

const serializeDraft = (draft: FieldDraft) =>
    JSON.stringify({
        areaAre: draft.areaAre,
        grapeVariety: draft.grapeVariety,
        otherGrapeVariety:
            draft.grapeVariety === 'OTHER' && draft.otherGrapeVariety?.trim()
                ? draft.otherGrapeVariety.trim()
                : undefined,
        grapeColor: draft.grapeColor,
    });

export const getFields = async (): Promise<VineyardField[]> => {
    const response = await apiFetch('/api/fields', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readField).filter((item) => Boolean(item.id));
};

export const createField = async (draft: FieldDraft): Promise<VineyardField> => {
    const response = await apiFetch('/api/fields', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readField(await response.json());
};

export const updateField = async (id: string, draft: FieldDraft): Promise<VineyardField> => {
    const response = await apiFetch(`/api/fields/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readField(await response.json());
};

export const deleteField = async (id: string): Promise<void> => {
    const response = await apiFetch(`/api/fields/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

export const getGrapeTypes = async (): Promise<GrapeVarietyOption[]> => {
    try {
        const response = await apiFetch('/api/grape-types', {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) {
            return DEFAULT_GRAPE_VARIETIES;
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return DEFAULT_GRAPE_VARIETIES;
        }
        return data.flatMap((item) => {
            if (!item || typeof item !== 'object') {
                return [];
            }
            const record = item as Record<string, unknown>;
            if (typeof record.value !== 'string' || typeof record.label !== 'string') {
                return [];
            }
            return [
                {
                    value: record.value as GrapeVariety,
                    label: record.label,
                    requiresCustomName: Boolean(record.requiresCustomName),
                },
            ];
        });
    } catch {
        return DEFAULT_GRAPE_VARIETIES;
    }
};

export const getGrapeColors = async (): Promise<GrapeColor[]> => {
    try {
        const response = await apiFetch('/api/grape-colors', {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) {
            return DEFAULT_GRAPE_COLORS;
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return DEFAULT_GRAPE_COLORS;
        }
        const colors = data.filter(
            (item): item is GrapeColor => item === 'RED' || item === 'WHITE',
        );
        return colors.length > 0 ? colors : DEFAULT_GRAPE_COLORS;
    } catch {
        return DEFAULT_GRAPE_COLORS;
    }
};

export const formatFieldLabel = (field: VineyardField): string =>
    `${field.grapeVarietyName} (${field.grapeColor === 'RED' ? 'Red' : 'White'}, ${field.areaAre} ar)`;

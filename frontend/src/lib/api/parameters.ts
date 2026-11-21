const STORAGE_KEY = 'wms_chemical_parameters_v1';

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

const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `param-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStore = (): ChemicalParameterRecord[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChemicalParameterRecord[]) : [];
    } catch {
        return [];
    }
};

const writeStore = (records: ChemicalParameterRecord[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
};

const toNullableNumber = (val: number | null | undefined): number | null => {
    if (val === null || val === undefined || Number.isNaN(Number(val))) {
        return null;
    }
    return Number(val);
};

export const getAllParameters = async (): Promise<ChemicalParameterRecord[]> => {
    return readStore().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
};

export const getBatchParameters = async (batchId: string): Promise<ChemicalParameterRecord[]> => {
    return readStore()
        .filter((record) => record.batchId === batchId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
};

export const createBatchParameter = async (
    batchId: string,
    draft: ChemicalParameterDraft,
): Promise<ChemicalParameterRecord> => {
    const records = readStore();
    const created: ChemicalParameterRecord = {
        id: makeId(),
        batchId,
        recordedAt: draft.recordedAt || new Date().toISOString(),
        sugarLevel: toNullableNumber(draft.sugarLevel),
        acidity: toNullableNumber(draft.acidity),
        pH: toNullableNumber(draft.pH),
        temperature: toNullableNumber(draft.temperature),
        alcoholContent: toNullableNumber(draft.alcoholContent),
    };
    writeStore([created, ...records]);
    return created;
};

export const updateBatchParameter = async (
    id: string,
    draft: ChemicalParameterDraft,
): Promise<ChemicalParameterRecord> => {
    const records = readStore();
    const existing = records.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Parameter record not found.');
    }
    const updated: ChemicalParameterRecord = {
        ...existing,
        recordedAt: draft.recordedAt ?? existing.recordedAt,
        sugarLevel: toNullableNumber(draft.sugarLevel),
        acidity: toNullableNumber(draft.acidity),
        pH: toNullableNumber(draft.pH),
        temperature: toNullableNumber(draft.temperature),
        alcoholContent: toNullableNumber(draft.alcoholContent),
    };
    writeStore(records.map((item) => (item.id === id ? updated : item)));
    return updated;
};

export const deleteBatchParameter = async (id: string): Promise<void> => {
    const records = readStore();
    writeStore(records.filter((item) => item.id !== id));
};

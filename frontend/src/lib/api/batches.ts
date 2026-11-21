import type { NutrientProfile } from '$lib/functions/calculators';

const STORAGE_KEY = 'wms_production_batches_v1';
const COUNTER_KEY = 'wms_production_batches_counter_v1';

export type BatchStage = 'MUST' | 'FERMENTING' | 'AGED' | 'BLENDED' | 'BOTTLED';

export type BatchSourceItem = {
    sourceId: string;
    sourceType: 'HARVEST' | 'BATCH';
    label: string;
    quantity: number;
};

export type BatchIngredientItem = {
    id: string;
    ingredientId: string;
    ingredientName: string;
    quantityGrams: number;
};

export type ProductionBatch = {
    id: string;
    batchNumber: string;
    name: string;
    stage: BatchStage;
    quantity: number;
    equipmentId: string;
    equipmentLabel: string;
    createdAt: string;
    isSpoiled: boolean;
    yeastId: string;
    description: string;
    sources: BatchSourceItem[];
    ingredients: BatchIngredientItem[];
    nutrientsOverride: NutrientProfile | null;
};

export type BatchDraft = {
    name: string;
    stage: BatchStage;
    quantity: number;
    equipmentId: string;
    equipmentLabel: string;
    yeastId?: string;
    description?: string;
    sources: BatchSourceItem[];
    ingredients?: BatchIngredientItem[];
};

export const STAGE_LABELS: Record<BatchStage, string> = {
    MUST: 'Must',
    FERMENTING: 'Fermenting must',
    AGED: 'Aged wine',
    BLENDED: 'Blended wine',
    BOTTLED: 'Bottled wine',
};

export const ALLOWED_SOURCE_STAGES: Record<BatchStage, BatchStage[]> = {
    MUST: [],
    FERMENTING: ['MUST'],
    AGED: ['FERMENTING'],
    BLENDED: ['FERMENTING', 'AGED'],
    BOTTLED: ['FERMENTING', 'AGED', 'BLENDED'],
};

const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStore = (): ProductionBatch[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ProductionBatch[]) : [];
    } catch {
        return [];
    }
};

const writeStore = (batches: ProductionBatch[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
    }
};

const nextBatchNumber = (): string => {
    if (typeof localStorage === 'undefined') {
        return 'BATCH-1001';
    }
    const current = Number(localStorage.getItem(COUNTER_KEY) ?? '1001') || 1001;
    localStorage.setItem(COUNTER_KEY, String(current + 1));
    return `BATCH-${current}`;
};

const validateSourcesNotSpoiled = (sources: BatchSourceItem[], allBatches: ProductionBatch[]) => {
    for (const src of sources) {
        if (src.sourceType === 'BATCH') {
            const found = allBatches.find((item) => item.id === src.sourceId);
            if (found?.isSpoiled) {
                throw new Error(
                    `Source batch "${found.name}" (${found.batchNumber}) is marked as spoiled and cannot enter the next stage.`,
                );
            }
        }
    }
};

export const getBatches = async (stage?: BatchStage): Promise<ProductionBatch[]> => {
    const all = readStore().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return stage ? all.filter((batch) => batch.stage === stage) : all;
};

export const createBatch = async (draft: BatchDraft): Promise<ProductionBatch> => {
    if (!draft.name.trim()) {
        throw new Error('Batch name is required.');
    }
    if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
        throw new Error('Batch quantity must be greater than 0.');
    }
    const all = readStore();
    validateSourcesNotSpoiled(draft.sources, all);

    const created: ProductionBatch = {
        id: makeId(),
        batchNumber: nextBatchNumber(),
        name: draft.name.trim(),
        stage: draft.stage,
        quantity: Number(draft.quantity),
        equipmentId: draft.equipmentId,
        equipmentLabel: draft.equipmentLabel,
        createdAt: new Date().toISOString(),
        isSpoiled: false,
        yeastId: draft.yeastId || 'EC1118',
        description: draft.description?.trim() ?? '',
        sources: draft.sources,
        ingredients: draft.ingredients ?? [],
        nutrientsOverride: null,
    };

    writeStore([created, ...all]);
    return created;
};

export const updateBatch = async (id: string, draft: BatchDraft): Promise<ProductionBatch> => {
    if (!draft.name.trim()) {
        throw new Error('Batch name is required.');
    }
    if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
        throw new Error('Batch quantity must be greater than 0.');
    }
    const all = readStore();
    const existing = all.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Batch not found.');
    }
    validateSourcesNotSpoiled(draft.sources, all);

    const updated: ProductionBatch = {
        ...existing,
        name: draft.name.trim(),
        quantity: Number(draft.quantity),
        equipmentId: draft.equipmentId,
        equipmentLabel: draft.equipmentLabel,
        yeastId: draft.yeastId ?? existing.yeastId,
        description: draft.description?.trim() ?? existing.description,
        sources: draft.sources,
        ingredients: draft.ingredients ?? existing.ingredients,
    };
    writeStore(all.map((item) => (item.id === id ? updated : item)));
    return updated;
};

export const deleteBatch = async (id: string): Promise<void> => {
    const all = readStore();
    writeStore(all.filter((item) => item.id !== id));
};

export const setBatchSpoiled = async (
    id: string,
    isSpoiled: boolean,
): Promise<ProductionBatch> => {
    const all = readStore();
    const existing = all.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Batch not found.');
    }
    const updated: ProductionBatch = { ...existing, isSpoiled };
    writeStore(all.map((item) => (item.id === id ? updated : item)));
    return updated;
};

export const setBatchIngredients = async (
    id: string,
    ingredients: BatchIngredientItem[],
): Promise<ProductionBatch> => {
    const all = readStore();
    const existing = all.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Batch not found.');
    }
    const updated: ProductionBatch = { ...existing, ingredients };
    writeStore(all.map((item) => (item.id === id ? updated : item)));
    return updated;
};

export const setBatchNutrients = async (
    id: string,
    nutrientsOverride: NutrientProfile | null,
): Promise<ProductionBatch> => {
    const all = readStore();
    const existing = all.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Batch not found.');
    }
    const updated: ProductionBatch = { ...existing, nutrientsOverride };
    writeStore(all.map((item) => (item.id === id ? updated : item)));
    return updated;
};

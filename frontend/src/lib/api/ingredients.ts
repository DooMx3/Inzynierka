import { apiFetch, toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type Ingredient = {
    id: string;
    number: string;
    name: string;
    energyContent: number;
    fat: number;
    saturatedFattyAcids: number;
    carbs: number;
    sugars: number;
    protein: number;
    salt: number;
    fibers: number;
};

export type IngredientDraft = Omit<Ingredient, 'id' | 'number'>;

export type BatchIngredientEntry = {
    id: string;
    ingredientId: string;
    ingredientNumber?: string;
    ingredientName: string;
    quantityGrams: number;
};

export type BatchIngredientDraft = {
    ingredientId: string;
    quantityGrams: number;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const toNum = (val: unknown): number =>
    typeof val === 'number' && Number.isFinite(val) ? val : Number(val) || 0;

const round2 = (val: number): number => Math.round(Math.max(0, Number(val) || 0) * 100) / 100;

export const readIngredient = (data: unknown): Ingredient => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        number: typeof record.number === 'string' ? record.number : '',
        name: typeof record.name === 'string' ? record.name : '',
        energyContent: toNum(record.energyContent),
        fat: toNum(record.fat),
        saturatedFattyAcids: toNum(record.saturatedFattyAcids),
        carbs: toNum(record.carbs),
        sugars: toNum(record.sugars),
        protein: toNum(record.protein),
        salt: toNum(record.salt),
        fibers: toNum(record.fibers),
    };
};

export const readBatchIngredient = (data: unknown): BatchIngredientEntry => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        ingredientId: typeof record.ingredientId === 'string' ? record.ingredientId : '',
        ingredientNumber:
            typeof record.ingredientNumber === 'string' ? record.ingredientNumber : undefined,
        ingredientName: typeof record.ingredientName === 'string' ? record.ingredientName : '',
        quantityGrams: toNum(record.quantityGrams),
    };
};

const sanitizeDraft = (draft: IngredientDraft): IngredientDraft => ({
    name: draft.name.trim(),
    energyContent: round2(draft.energyContent),
    fat: round2(draft.fat),
    saturatedFattyAcids: round2(draft.saturatedFattyAcids),
    carbs: round2(draft.carbs),
    sugars: round2(draft.sugars),
    protein: round2(draft.protein),
    salt: round2(draft.salt),
    fibers: round2(draft.fibers),
});

export const getIngredients = async (): Promise<Ingredient[]> => {
    const response = await apiFetch('/api/ingredients', {
        method: 'GET',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readIngredient).filter((item) => Boolean(item.id));
};

export const getIngredientById = async (id: string): Promise<Ingredient> => {
    const response = await apiFetch(`/api/ingredients/${encodeURIComponent(id)}`, {
        method: 'GET',
    });
    await ensureOk(response);
    return readIngredient(await response.json());
};

export const createIngredient = async (draft: IngredientDraft): Promise<Ingredient> => {
    const clean = sanitizeDraft(draft);
    if (!clean.name) {
        throw new Error('Ingredient name is required.');
    }
    const response = await apiFetch('/api/ingredients', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(clean),
    });
    await ensureOk(response);
    return readIngredient(await response.json());
};

export const updateIngredient = async (
    id: string,
    draft: IngredientDraft,
): Promise<Ingredient> => {
    const clean = sanitizeDraft(draft);
    if (!clean.name) {
        throw new Error('Ingredient name is required.');
    }
    const response = await apiFetch(`/api/ingredients/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(clean),
    });
    await ensureOk(response);
    return readIngredient(await response.json());
};

export const deleteIngredient = async (id: string): Promise<void> => {
    const response = await apiFetch(`/api/ingredients/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    await ensureOk(response);
};

export const getBatchIngredients = async (batchId: string): Promise<BatchIngredientEntry[]> => {
    const response = await apiFetch(
        `/api/batches/${encodeURIComponent(batchId)}/ingredients`,
        {
            method: 'GET',
        },
    );
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readBatchIngredient).filter((item) => Boolean(item.id));
};

export const addBatchIngredient = async (
    batchId: string,
    draft: BatchIngredientDraft,
): Promise<BatchIngredientEntry> => {
    const response = await apiFetch(
        `/api/batches/${encodeURIComponent(batchId)}/ingredients`,
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
                ingredientId: draft.ingredientId,
                quantityGrams: round2(draft.quantityGrams),
            }),
        },
    );
    await ensureOk(response);
    return readBatchIngredient(await response.json());
};

export const updateBatchIngredient = async (
    batchId: string,
    entryId: string,
    draft: BatchIngredientDraft,
): Promise<BatchIngredientEntry> => {
    const response = await apiFetch(
        `/api/batches/${encodeURIComponent(batchId)}/ingredients/${encodeURIComponent(entryId)}`,
        {
            method: 'PUT',
            headers: jsonHeaders,
            body: JSON.stringify({
                ingredientId: draft.ingredientId,
                quantityGrams: round2(draft.quantityGrams),
            }),
        },
    );
    await ensureOk(response);
    return readBatchIngredient(await response.json());
};

export const deleteBatchIngredient = async (
    batchId: string,
    entryId: string,
): Promise<void> => {
    const response = await apiFetch(
        `/api/batches/${encodeURIComponent(batchId)}/ingredients/${encodeURIComponent(entryId)}`,
        {
            method: 'DELETE',
        },
    );
    await ensureOk(response);
};

export const syncBatchIngredients = async (
    batchId: string,
    nextItems: BatchIngredientEntry[],
    previousItems?: BatchIngredientEntry[],
): Promise<BatchIngredientEntry[]> => {
    const current = previousItems ?? (await getBatchIngredients(batchId));
    const currentById = new Map(current.map((item) => [item.id, item]));
    const nextById = new Map(nextItems.map((item) => [item.id, item]));

    for (const prev of current) {
        if (!nextById.has(prev.id)) {
            await deleteBatchIngredient(batchId, prev.id);
        }
    }

    const synced: BatchIngredientEntry[] = [];
    for (const item of nextItems) {
        const existing = currentById.get(item.id);
        if (existing) {
            if (
                existing.ingredientId !== item.ingredientId ||
                existing.quantityGrams !== item.quantityGrams
            ) {
                synced.push(
                    await updateBatchIngredient(batchId, existing.id, {
                        ingredientId: item.ingredientId,
                        quantityGrams: item.quantityGrams,
                    }),
                );
            } else {
                synced.push(existing);
            }
        } else {
            synced.push(
                await addBatchIngredient(batchId, {
                    ingredientId: item.ingredientId,
                    quantityGrams: item.quantityGrams,
                }),
            );
        }
    }

    return synced;
};

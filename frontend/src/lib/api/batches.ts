import { ApiError, apiFetch, toApiError } from '$lib/api/auth';
import {
    getBatchIngredients,
    syncBatchIngredients,
    type BatchIngredientEntry,
} from '$lib/api/ingredients';
import type { NutrientProfile } from '$lib/functions/calculators';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export const BATCH_METADATA_STORAGE_KEY = 'wms_batch_metadata_v1';
const FALLBACK_STORAGE_KEY = 'wms_production_batches_v1';
const FALLBACK_COUNTER_KEY = 'wms_production_batches_counter_v1';

export type BatchStage = 'MUST' | 'FERMENTING' | 'AGED' | 'BLENDED' | 'BOTTLED';

export type BatchSourceItem = {
    linkId?: string;
    sourceId: string;
    sourceType: 'HARVEST' | 'BATCH';
    label: string;
    quantity: number;
};

export type BatchIngredientItem = BatchIngredientEntry;

export type BatchLocalMetadata = {
    equipmentId?: string;
    equipmentLabel?: string;
    yeastId?: string;
    description?: string;
    sourceLabels?: Record<string, string>;
    nutrientsOverride?: NutrientProfile | null;
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

const VALID_STAGES = new Set<BatchStage>(['MUST', 'FERMENTING', 'AGED', 'BLENDED', 'BOTTLED']);

type RawBatchResponse = {
    id: string;
    name: string;
    stage: BatchStage;
    quantity: number;
    isSpoiled: boolean;
    deleted: boolean;
    createdAt: string;
};

type RawHistoryPayload = {
    harvestSources: { id: string; harvestId: string; quantity: number }[];
    sourceChanges: { id: string; sourceBatchId: string; targetBatchId: string; quantity: number }[];
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const isNetworkError = (error: unknown): boolean => {
    if (error instanceof TypeError) {
        return true;
    }
    if (error && typeof error === 'object') {
        const name = (error as { name?: unknown }).name;
        const code = (error as { code?: unknown }).code;
        if (name === 'NetworkError' || name === 'AbortError' || code === 'ECONNREFUSED') {
            return true;
        }
    }
    return false;
};

const isOfflineOrUnavailable = (error: unknown): boolean => {
    if (error instanceof ApiError) {
        return error.status === 404 || error.status === 401 || error.status === 403;
    }
    return isNetworkError(error);
};

const isOfflineMutationFallback = (error: unknown): boolean => {
    if (error instanceof ApiError) {
        return error.status === 404;
    }
    return isNetworkError(error);
};

const round2 = (val: number): number => Math.round((Number(val) || 0) * 100) / 100;

const makeLocalId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readFallbackStore = (): ProductionBatch[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }
    try {
        const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ProductionBatch[]) : [];
    } catch {
        return [];
    }
};

const writeFallbackStore = (batches: ProductionBatch[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(batches));
    }
};

const nextFallbackBatchNumber = (): string => {
    if (typeof localStorage === 'undefined') {
        return 'BATCH-1001';
    }
    const current = Number(localStorage.getItem(FALLBACK_COUNTER_KEY) ?? '1001') || 1001;
    localStorage.setItem(FALLBACK_COUNTER_KEY, String(current + 1));
    return `BATCH-${current}`;
};

const readMetadataMap = (): Record<string, BatchLocalMetadata> => {
    if (typeof localStorage === 'undefined') {
        return {};
    }
    try {
        const raw = localStorage.getItem(BATCH_METADATA_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, BatchLocalMetadata>)
            : {};
    } catch {
        return {};
    }
};

const writeMetadataMap = (map: Record<string, BatchLocalMetadata>) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BATCH_METADATA_STORAGE_KEY, JSON.stringify(map));
    }
};

export const saveBatchMetadata = (batchId: string, patch: BatchLocalMetadata): void => {
    if (!batchId) {
        return;
    }
    const map = readMetadataMap();
    map[batchId] = {
        ...(map[batchId] ?? {}),
        ...patch,
    };
    writeMetadataMap(map);
};

const removeBatchMetadata = (batchId: string): void => {
    const map = readMetadataMap();
    if (batchId in map) {
        delete map[batchId];
        writeMetadataMap(map);
    }
};

const buildSourceLabelMap = (sources: BatchSourceItem[]): Record<string, string> => {
    const labels: Record<string, string> = {};
    for (const s of sources) {
        if (s.sourceId && s.label) {
            labels[s.sourceId] = s.label;
        }
    }
    return labels;
};

const readRawBatch = (data: unknown): RawBatchResponse => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const rawStage = typeof record.stage === 'string' ? (record.stage as BatchStage) : 'MUST';
    return {
        id: typeof record.id === 'string' ? record.id : '',
        name: typeof record.name === 'string' ? record.name : '',
        stage: VALID_STAGES.has(rawStage) ? rawStage : 'MUST',
        quantity:
            typeof record.quantity === 'number' ? record.quantity : Number(record.quantity) || 0,
        isSpoiled: Boolean(record.isSpoiled ?? record.spoiled),
        deleted: Boolean(record.deleted),
        createdAt:
            typeof record.createdAt === 'string' && record.createdAt
                ? record.createdAt
                : new Date().toISOString(),
    };
};

const readRawHistory = (data: unknown): RawHistoryPayload => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { harvestSources: [], sourceChanges: [] };
    }
    const record = data as Record<string, unknown>;
    const harvestSources = Array.isArray(record.harvestSources)
        ? record.harvestSources.flatMap((item) => {
              if (!item || typeof item !== 'object') {
                  return [];
              }
              const r = item as Record<string, unknown>;
              if (typeof r.harvestId !== 'string') {
                  return [];
              }
              return [
                  {
                      id: typeof r.id === 'string' ? r.id : '',
                      harvestId: r.harvestId,
                      quantity:
                          typeof r.quantity === 'number' ? r.quantity : Number(r.quantity) || 0,
                  },
              ];
          })
        : [];
    const sourceChanges = Array.isArray(record.sourceChanges)
        ? record.sourceChanges.flatMap((item) => {
              if (!item || typeof item !== 'object') {
                  return [];
              }
              const r = item as Record<string, unknown>;
              if (typeof r.sourceBatchId !== 'string') {
                  return [];
              }
              return [
                  {
                      id: typeof r.id === 'string' ? r.id : '',
                      sourceBatchId: r.sourceBatchId,
                      targetBatchId: typeof r.targetBatchId === 'string' ? r.targetBatchId : '',
                      quantity:
                          typeof r.quantity === 'number' ? r.quantity : Number(r.quantity) || 0,
                  },
              ];
          })
        : [];
    return { harvestSources, sourceChanges };
};

const fetchBatchHistorySafe = async (batchId: string): Promise<RawHistoryPayload> => {
    try {
        const response = await apiFetch(`/api/batches/${encodeURIComponent(batchId)}/history`, {
            method: 'GET',
        });
        if (!response.ok) {
            return { harvestSources: [], sourceChanges: [] };
        }
        return readRawHistory(await response.json());
    } catch {
        return { harvestSources: [], sourceChanges: [] };
    }
};

const buildNumberMap = (rawBatches: RawBatchResponse[]): Map<string, string> => {
    const chronological = [...rawBatches].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    const map = new Map<string, string>();
    chronological.forEach((batch, index) => {
        map.set(batch.id, `BATCH-${1001 + index}`);
    });
    return map;
};

const hydrateBatches = async (
    rawBatches: RawBatchResponse[],
    stageFilter?: BatchStage,
): Promise<ProductionBatch[]> => {
    const active = rawBatches.filter((b) => Boolean(b.id) && !b.deleted);
    const numberById = buildNumberMap(active);
    const rawById = new Map(active.map((b) => [b.id, b]));
    const metadataMap = readMetadataMap();

    const filtered = stageFilter ? active.filter((b) => b.stage === stageFilter) : active;

    const hydrated = await Promise.all(
        filtered.map(async (raw): Promise<ProductionBatch> => {
            const [history, ingredients] = await Promise.all([
                fetchBatchHistorySafe(raw.id),
                getBatchIngredients(raw.id).catch(() => []),
            ]);

            const meta = metadataMap[raw.id] ?? {};
            const savedLabels = meta.sourceLabels ?? {};

            const sources: BatchSourceItem[] = [
                ...history.harvestSources.map((hs) => ({
                    linkId: hs.id || undefined,
                    sourceId: hs.harvestId,
                    sourceType: 'HARVEST' as const,
                    label:
                        savedLabels[hs.harvestId] ??
                        `Harvest ${hs.harvestId.slice(0, 8)} (${hs.quantity} kg)`,
                    quantity: hs.quantity,
                })),
                ...history.sourceChanges.map((bs) => {
                    const srcBatch = rawById.get(bs.sourceBatchId);
                    const srcNumber =
                        numberById.get(bs.sourceBatchId) ?? bs.sourceBatchId.slice(0, 8);
                    const defaultLabel = srcBatch
                        ? `${srcNumber} | ${srcBatch.name} (${STAGE_LABELS[srcBatch.stage]}) | ${bs.quantity} L`
                        : `${srcNumber} (${bs.quantity} L)`;
                    return {
                        linkId: bs.id || undefined,
                        sourceId: bs.sourceBatchId,
                        sourceType: 'BATCH' as const,
                        label: savedLabels[bs.sourceBatchId] ?? defaultLabel,
                        quantity: bs.quantity,
                    };
                }),
            ];

            const equipmentId = meta.equipmentId ?? '';
            const equipmentLabel =
                meta.equipmentLabel ?? (equipmentId ? equipmentId : 'Unassigned');

            return {
                id: raw.id,
                batchNumber: numberById.get(raw.id) ?? `BATCH-${raw.id.slice(0, 4).toUpperCase()}`,
                name: raw.name,
                stage: raw.stage,
                quantity: raw.quantity,
                equipmentId,
                equipmentLabel,
                createdAt: raw.createdAt,
                isSpoiled: raw.isSpoiled,
                yeastId: meta.yeastId || 'EC1118',
                description: meta.description ?? '',
                sources,
                ingredients,
                nutrientsOverride: meta.nutrientsOverride ?? null,
            };
        }),
    );

    return hydrated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const fetchRawBatches = async (): Promise<RawBatchResponse[]> => {
    const response = await apiFetch('/api/batches', { method: 'GET' });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readRawBatch).filter((b) => Boolean(b.id) && !b.deleted);
};

const validateSourcesNotSpoiled = (
    sources: BatchSourceItem[],
    candidates: { id: string; name: string; batchNumber?: string; isSpoiled: boolean }[],
) => {
    for (const src of sources) {
        if (src.sourceType === 'BATCH') {
            const found = candidates.find((item) => item.id === src.sourceId);
            if (found?.isSpoiled) {
                const batchNo = found.batchNumber ?? found.id;
                throw new Error(
                    `Source batch "${found.name}" (${batchNo}) is marked as spoiled and cannot enter the next stage.`,
                );
            }
        }
    }
};

const syncSourcesForBatch = async (
    batchId: string,
    nextSources: BatchSourceItem[],
    previousSources: BatchSourceItem[],
) => {
    const prevByLinkId = new Map(
        previousSources.filter((s) => Boolean(s.linkId)).map((s) => [s.linkId!, s]),
    );

    for (const src of nextSources) {
        const qty = round2(src.quantity);
        if (src.sourceType === 'HARVEST') {
            const existing = src.linkId ? prevByLinkId.get(src.linkId) : undefined;
            if (existing?.linkId) {
                if (existing.sourceId !== src.sourceId || existing.quantity !== qty) {
                    const res = await apiFetch(
                        `/api/batches/harvest-sources/${encodeURIComponent(existing.linkId)}`,
                        {
                            method: 'PUT',
                            headers: jsonHeaders,
                            body: JSON.stringify({ harvestId: src.sourceId, quantity: qty }),
                        },
                    );
                    await ensureOk(res);
                }
            } else {
                const res = await apiFetch(
                    `/api/batches/${encodeURIComponent(batchId)}/harvest-sources`,
                    {
                        method: 'POST',
                        headers: jsonHeaders,
                        body: JSON.stringify({ harvestId: src.sourceId, quantity: qty }),
                    },
                );
                await ensureOk(res);
            }
        } else {
            const existing = src.linkId ? prevByLinkId.get(src.linkId) : undefined;
            if (existing?.linkId) {
                if (existing.sourceId !== src.sourceId || existing.quantity !== qty) {
                    const params = new URLSearchParams({
                        sourceBatchId: src.sourceId,
                        targetBatchId: batchId,
                        quantity: String(qty),
                    });
                    const res = await apiFetch(
                        `/api/batches/sources/${encodeURIComponent(existing.linkId)}?${params.toString()}`,
                        {
                            method: 'PUT',
                        },
                    );
                    await ensureOk(res);
                }
            } else {
                const params = new URLSearchParams({ quantity: String(qty) });
                const res = await apiFetch(
                    `/api/batches/${encodeURIComponent(src.sourceId)}/sources/${encodeURIComponent(batchId)}?${params.toString()}`,
                    {
                        method: 'POST',
                    },
                );
                await ensureOk(res);
            }
        }
    }
};

export const getBatches = async (stage?: BatchStage): Promise<ProductionBatch[]> => {
    const localItems = readFallbackStore();
    try {
        const rawBatches = await fetchRawBatches();
        const remoteHydrated = await hydrateBatches(rawBatches, stage);
        if (localItems.length === 0) {
            return remoteHydrated;
        }
        const remoteIds = new Set(remoteHydrated.map((b) => b.id));
        const extraLocal = localItems.filter(
            (b) => !remoteIds.has(b.id) && (!stage || b.stage === stage),
        );
        return [...remoteHydrated, ...extraLocal].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
        );
    } catch (error) {
        if (isOfflineOrUnavailable(error)) {
            const sorted = [...localItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            return stage ? sorted.filter((b) => b.stage === stage) : sorted;
        }
        throw error;
    }
};

export const getBatchById = async (id: string): Promise<ProductionBatch> => {
    const all = await getBatches();
    const found = all.find((item) => item.id === id);
    if (found) {
        return found;
    }
    const response = await apiFetch(`/api/batches/${encodeURIComponent(id)}`, {
        method: 'GET',
    });
    await ensureOk(response);
    const raw = readRawBatch(await response.json());
    const [hydrated] = await hydrateBatches([raw]);
    if (!hydrated) {
        throw new Error('Batch not found.');
    }
    return hydrated;
};

export const createBatch = async (draft: BatchDraft): Promise<ProductionBatch> => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
        throw new Error('Batch name is required.');
    }
    const targetQuantity = round2(draft.quantity);
    if (!Number.isFinite(targetQuantity) || targetQuantity <= 0) {
        throw new Error('Batch quantity must be greater than 0.');
    }

    const localItems = readFallbackStore();

    try {
        const existingRaw = await fetchRawBatches();
        const numberById = buildNumberMap(existingRaw);
        validateSourcesNotSpoiled(draft.sources, [
            ...existingRaw.map((b) => ({
                id: b.id,
                name: b.name,
                batchNumber: numberById.get(b.id),
                isSpoiled: b.isSpoiled,
            })),
            ...localItems,
        ]);

        const harvestSources = draft.sources.filter((s) => s.sourceType === 'HARVEST');
        const batchSources = draft.sources.filter((s) => s.sourceType === 'BATCH');

        let createdRaw: RawBatchResponse | null = null;

        if (draft.stage === 'MUST' && harvestSources.length > 0) {
            const fromHarvestRes = await apiFetch('/api/batches/from-harvest', {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({
                    name: trimmedName,
                    harvests: harvestSources.map((s) => ({
                        harvestId: s.sourceId,
                        quantity: round2(s.quantity),
                    })),
                }),
            });
            if (fromHarvestRes.ok) {
                const candidate = readRawBatch(await fromHarvestRes.json());
                if (candidate.id) {
                    createdRaw = candidate;
                    if (Math.abs(createdRaw.quantity - targetQuantity) > 0.009) {
                        const updateRes = await apiFetch(
                            `/api/batches/${encodeURIComponent(createdRaw.id)}`,
                            {
                                method: 'PUT',
                                headers: jsonHeaders,
                                body: JSON.stringify({
                                    name: trimmedName,
                                    stage: 'MUST',
                                    quantity: targetQuantity,
                                    isSpoiled: false,
                                }),
                            },
                        );
                        if (updateRes.ok) {
                            createdRaw = readRawBatch(await updateRes.json());
                        }
                    }
                }
            } else if (fromHarvestRes.status !== 404) {
                await ensureOk(fromHarvestRes);
            }
        }

        if (!createdRaw) {
            const response = await apiFetch('/api/batches', {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({
                    name: trimmedName,
                    stage: draft.stage,
                    quantity: targetQuantity,
                    isSpoiled: false,
                }),
            });
            await ensureOk(response);
            createdRaw = readRawBatch(await response.json());

            if (harvestSources.length > 0) {
                await syncSourcesForBatch(createdRaw.id, harvestSources, []);
            }
        }

        if (batchSources.length > 0) {
            await syncSourcesForBatch(createdRaw.id, batchSources, []);
        }

        if (draft.ingredients && draft.ingredients.length > 0) {
            await syncBatchIngredients(createdRaw.id, draft.ingredients, []);
        }

        saveBatchMetadata(createdRaw.id, {
            equipmentId: draft.equipmentId,
            equipmentLabel: draft.equipmentLabel || draft.equipmentId || 'Unassigned',
            yeastId: draft.yeastId || 'EC1118',
            description: draft.description?.trim() ?? '',
            sourceLabels: buildSourceLabelMap(draft.sources),
            nutrientsOverride: null,
        });

        const allAfter = await fetchRawBatches().catch(() => [...existingRaw, createdRaw!]);
        const list = allAfter.some((b) => b.id === createdRaw!.id)
            ? allAfter
            : [...allAfter, createdRaw!];
        const hydratedAll = await hydrateBatches(list);
        return (
            hydratedAll.find((b) => b.id === createdRaw!.id) ??
            (await hydrateBatches([createdRaw!]))[0]!
        );
    } catch (error) {
        if (!isOfflineMutationFallback(error)) {
            throw error;
        }
        validateSourcesNotSpoiled(draft.sources, localItems);
        const created: ProductionBatch = {
            id: makeLocalId(),
            batchNumber: nextFallbackBatchNumber(),
            name: trimmedName,
            stage: draft.stage,
            quantity: targetQuantity,
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
        writeFallbackStore([created, ...localItems]);
        return created;
    }
};

export const updateBatch = async (id: string, draft: BatchDraft): Promise<ProductionBatch> => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
        throw new Error('Batch name is required.');
    }
    const targetQuantity = round2(draft.quantity);
    if (!Number.isFinite(targetQuantity) || targetQuantity <= 0) {
        throw new Error('Batch quantity must be greater than 0.');
    }

    const localItems = readFallbackStore();
    const localExisting = localItems.find((item) => item.id === id);

    try {
        const existingRaw = await fetchRawBatches();
        const numberById = buildNumberMap(existingRaw);
        validateSourcesNotSpoiled(draft.sources, [
            ...existingRaw.map((b) => ({
                id: b.id,
                name: b.name,
                batchNumber: numberById.get(b.id),
                isSpoiled: b.isSpoiled,
            })),
            ...localItems,
        ]);

        const existingHydrated = (await hydrateBatches(existingRaw)).find((item) => item.id === id);
        if (!existingHydrated) {
            throw new ApiError('Batch not found.', 404);
        }

        const response = await apiFetch(`/api/batches/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: jsonHeaders,
            body: JSON.stringify({
                name: trimmedName,
                stage: draft.stage,
                quantity: targetQuantity,
                isSpoiled: existingHydrated.isSpoiled,
            }),
        });
        await ensureOk(response);
        const updatedRaw = readRawBatch(await response.json());

        await syncSourcesForBatch(id, draft.sources, existingHydrated.sources);

        if (draft.ingredients !== undefined) {
            await syncBatchIngredients(id, draft.ingredients, existingHydrated.ingredients);
        }

        saveBatchMetadata(id, {
            equipmentId: draft.equipmentId,
            equipmentLabel: draft.equipmentLabel || draft.equipmentId || 'Unassigned',
            yeastId: draft.yeastId ?? existingHydrated.yeastId,
            description: draft.description?.trim() ?? existingHydrated.description,
            sourceLabels: buildSourceLabelMap(draft.sources),
        });

        const nextRawList = existingRaw.map((b) => (b.id === id ? updatedRaw : b));
        const hydratedAll = await hydrateBatches(nextRawList);
        return hydratedAll.find((b) => b.id === id)!;
    } catch (error) {
        if (!isOfflineMutationFallback(error) || !localExisting) {
            throw error;
        }
        validateSourcesNotSpoiled(draft.sources, localItems);
        const updated: ProductionBatch = {
            ...localExisting,
            name: trimmedName,
            quantity: targetQuantity,
            equipmentId: draft.equipmentId,
            equipmentLabel: draft.equipmentLabel,
            yeastId: draft.yeastId ?? localExisting.yeastId,
            description: draft.description?.trim() ?? localExisting.description,
            sources: draft.sources,
            ingredients: draft.ingredients ?? localExisting.ingredients,
        };
        writeFallbackStore(localItems.map((item) => (item.id === id ? updated : item)));
        return updated;
    }
};

export const changeBatchStage = async (
    id: string,
    stage: BatchStage,
): Promise<ProductionBatch> => {
    const response = await apiFetch(
        `/api/batches/${encodeURIComponent(id)}/stage?stage=${encodeURIComponent(stage)}`,
        {
            method: 'PATCH',
        },
    );
    await ensureOk(response);
    return getBatchById(id);
};

export const deleteBatch = async (id: string): Promise<void> => {
    try {
        const response = await apiFetch(`/api/batches/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        await ensureOk(response);
    } catch (error) {
        if (!isOfflineMutationFallback(error)) {
            throw error;
        }
    }
    removeBatchMetadata(id);
    const localItems = readFallbackStore();
    if (localItems.some((item) => item.id === id)) {
        writeFallbackStore(localItems.filter((item) => item.id !== id));
    }
};

export const setBatchSpoiled = async (
    id: string,
    isSpoiled: boolean,
): Promise<ProductionBatch> => {
    const localItems = readFallbackStore();
    const localExisting = localItems.find((item) => item.id === id);

    try {
        const response = await apiFetch(
            `/api/batches/${encodeURIComponent(id)}/spoiled?spoiled=${encodeURIComponent(String(isSpoiled))}`,
            {
                method: 'PATCH',
            },
        );
        await ensureOk(response);
        return getBatchById(id);
    } catch (error) {
        if (!isOfflineMutationFallback(error) || !localExisting) {
            throw error;
        }
        const updated: ProductionBatch = { ...localExisting, isSpoiled };
        writeFallbackStore(localItems.map((item) => (item.id === id ? updated : item)));
        return updated;
    }
};

export const setBatchIngredients = async (
    id: string,
    ingredients: BatchIngredientItem[],
): Promise<ProductionBatch> => {
    const localItems = readFallbackStore();
    const localExisting = localItems.find((item) => item.id === id);

    try {
        await syncBatchIngredients(id, ingredients);
        return getBatchById(id);
    } catch (error) {
        if (!isOfflineMutationFallback(error) || !localExisting) {
            throw error;
        }
        const updated: ProductionBatch = { ...localExisting, ingredients };
        writeFallbackStore(localItems.map((item) => (item.id === id ? updated : item)));
        return updated;
    }
};

export const setBatchNutrients = async (
    id: string,
    nutrientsOverride: NutrientProfile | null,
): Promise<ProductionBatch> => {
    saveBatchMetadata(id, { nutrientsOverride });
    const localItems = readFallbackStore();
    const localExisting = localItems.find((item) => item.id === id);
    if (localExisting) {
        const updated: ProductionBatch = { ...localExisting, nutrientsOverride };
        writeFallbackStore(localItems.map((item) => (item.id === id ? updated : item)));
    }
    return getBatchById(id);
};

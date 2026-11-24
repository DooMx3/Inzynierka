import { ApiError, toApiError } from '$lib/api/auth';
import { getBatches, type ProductionBatch } from '$lib/api/batches';
import { getIngredients } from '$lib/api/ingredients';
import { getOrganisationLogoByIdUrl } from '$lib/api/organisation';
import { getAllParameters, type ChemicalParameterRecord } from '$lib/api/parameters';
import {
    calculatePredictedAlcohol,
    calculateWineNutrients,
    type NutrientProfile,
} from '$lib/functions/calculators';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

const OVERLAY_STORAGE_KEY = 'wms_offerings_overlay_v1';
const ALLOWED_PHOTO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type WineOffering = {
    id: string;
    organisationId: string;
    organisationName?: string;
    wineId: string;
    wineName: string;
    wineDescription: string;
    price: number;
    imageUrl?: string | null;
    vintageYear?: number;
    alcoholPercent?: number;
    wineStyle?: string;
    barrelInfo?: string;
    grapeType?: string;
    localOnly?: boolean;
};

export type OfferingDraft = {
    wineId: string;
    price: number;
    wineName?: string;
    wineDescription?: string;
    imageUrl?: string | null;
    organisationId?: string;
    organisationName?: string;
    vintageYear?: number;
    alcoholPercent?: number;
    wineStyle?: string;
    barrelInfo?: string;
    grapeType?: string;
};

export type BatchHistoryApiPayload = {
    batch?: {
        id?: string;
        name?: string;
        stage?: string;
        quantity?: number;
        createdAt?: string;
    };
    harvestSources?: { id: string; harvestId: string; quantity: number }[];
    sourceChanges?: { id: string; sourceBatchId: string; targetBatchId: string; quantity: number }[];
};

export type CustomerBottleDetails = {
    offeringId: string;
    wineId: string;
    wineName: string;
    vineyardName: string;
    organisationId: string;
    logoUrl: string | null;
    imageUrl: string | null;
    description: string;
    price: number | null;
    wineStyle: string;
    vintageYear: number;
    grapeVariety: string;
    harvestDate: string;
    fermentationStart: string | null;
    fermentationEnd: string | null;
    barrelType: string | null;
    barrelDuration: string | null;
    bottledDate: string;
    parameters: {
        sugarLevel: number | null;
        acidity: number | null;
        pH: number | null;
        alcoholContent: number;
    };
    nutrients: NutrientProfile;
};

type LocalOverlayState = {
    created: WineOffering[];
    updated: Record<string, Partial<WineOffering>>;
    deletedIds: string[];
};

const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const readWinePhotoAsDataUrl = async (file: File): Promise<string> => {
    const inferredMime =
        file.type ||
        (/\.png$/i.test(file.name)
            ? 'image/png'
            : /\.webp$/i.test(file.name)
              ? 'image/webp'
              : /\.(jpe?g)$/i.test(file.name)
                ? 'image/jpeg'
                : '');

    if (!ALLOWED_PHOTO_TYPES.has(inferredMime)) {
        throw new Error('Choose a PNG, JPEG, or WebP wine image.');
    }
    if (file.size > MAX_PHOTO_BYTES) {
        throw new Error('Wine photo must be 5 MB or smaller.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:${inferredMime};base64,${btoa(binary)}`;
};

const readOverlay = (): LocalOverlayState => {
    if (typeof localStorage === 'undefined') {
        return { created: [], updated: {}, deletedIds: [] };
    }
    try {
        const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
        if (!raw) {
            return { created: [], updated: {}, deletedIds: [] };
        }
        const parsed = JSON.parse(raw) as Partial<LocalOverlayState>;
        return {
            created: Array.isArray(parsed.created) ? parsed.created : [],
            updated: parsed.updated && typeof parsed.updated === 'object' ? parsed.updated : {},
            deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        };
    } catch {
        return { created: [], updated: {}, deletedIds: [] };
    }
};

const writeOverlay = (state: LocalOverlayState) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(state));
    }
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readRemoteImageUrl = (record: Record<string, unknown>): string | null => {
    for (const key of ['imageUrl', 'photoUrl', 'imagePath']) {
        const candidate = record[key];
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return null;
};

const readOffering = (data: unknown): WineOffering => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: typeof record.id === 'string' ? record.id : '',
        organisationId: typeof record.organisationId === 'string' ? record.organisationId : '',
        organisationName:
            typeof record.organisationName === 'string' ? record.organisationName : undefined,
        wineId: typeof record.wineId === 'string' ? record.wineId : '',
        wineName: typeof record.wineName === 'string' ? record.wineName : 'Estate Wine',
        wineDescription:
            typeof record.wineDescription === 'string' ? record.wineDescription : '',
        price: typeof record.price === 'number' ? record.price : Number(record.price) || 0,
        imageUrl: readRemoteImageUrl(record),
    };
};

const inferStyleFromSugar = (sugarGL: number | null | undefined): string => {
    if (sugarGL == null || sugarGL <= 4) {
        return 'Dry wine';
    }
    if (sugarGL <= 12) {
        return 'Off-dry wine';
    }
    if (sugarGL <= 45) {
        return 'Semi-sweet wine';
    }
    return 'Sweet wine';
};

const enrichOfferingWithLocalBatch = (
    offering: WineOffering,
    allBatches: ProductionBatch[],
    allParams: ChemicalParameterRecord[],
): WineOffering => {
    const batch =
        allBatches.find((b) => b.id === offering.wineId) ??
        allBatches.find(
            (b) =>
                b.stage === 'BOTTLED' &&
                b.name.toLowerCase() === offering.wineName.toLowerCase(),
        );
    if (!batch) {
        return offering;
    }
    const latestParam = allParams.find((p) => p.batchId === batch.id);
    const abv =
        latestParam?.alcoholContent ??
        calculatePredictedAlcohol({
            volumeLiters: batch.quantity,
            juiceSugarGL: latestParam?.sugarLevel ?? 200,
            addedSugarGrams: 0,
            yeastId: batch.yeastId,
        }).predictedAbv;

    const agedSource = batch.sources
        .map((s) => allBatches.find((b) => b.id === s.sourceId))
        .find((b) => b?.stage === 'AGED');

    const harvestLabel = batch.sources.map((s) => s.label).join(' ');
    const inferredGrape =
        harvestLabel.match(
            /\b(Solaris|Regent|Rondo|Johanniter|Seyval Blanc|Muscaris|Cabernet Cortis|Hibernal|Riesling|Chardonnay|Pinot Noir|Merlot|White|Red)\b/i,
        )?.[0] ?? offering.grapeType;

    return {
        ...offering,
        wineDescription: offering.wineDescription || batch.description,
        vintageYear: offering.vintageYear ?? (Number(batch.createdAt.slice(0, 4)) || 2026),
        alcoholPercent: offering.alcoholPercent ?? abv,
        wineStyle: offering.wineStyle ?? inferStyleFromSugar(latestParam?.sugarLevel),
        barrelInfo:
            offering.barrelInfo ??
            (agedSource ? agedSource.equipmentLabel.replace(/\s*\(.*\)$/, '') : 'Stainless steel'),
        grapeType: inferredGrape ?? 'Estate Cuvée',
    };
};

export const getOfferings = async (organisationId?: string): Promise<WineOffering[]> => {
    const overlay = readOverlay();
    const deletedSet = new Set(overlay.deletedIds);
    let remote: WineOffering[] = [];

    try {
        const response = await fetch('/api/offerings', {
            method: 'GET',
            credentials: 'include',
        });
        if (response.ok) {
            const data: unknown = await response.json();
            if (Array.isArray(data)) {
                remote = data.map(readOffering).filter((item) => Boolean(item.id));
            }
        }
    } catch {
        remote = [];
    }

    const [allBatches, allParams] = await Promise.all([
        getBatches().catch(() => []),
        getAllParameters().catch(() => []),
    ]);

    const mergedMap = new Map<string, WineOffering>();
    for (const item of remote) {
        if (!deletedSet.has(item.id)) {
            mergedMap.set(item.id, {
                ...item,
                ...(overlay.updated[item.id] ?? {}),
            });
        }
    }
    for (const localItem of overlay.created) {
        if (!deletedSet.has(localItem.id) && !mergedMap.has(localItem.id)) {
            mergedMap.set(localItem.id, {
                ...localItem,
                ...(overlay.updated[localItem.id] ?? {}),
            });
        }
    }

    const scopedOrgId = organisationId?.trim() ?? '';
    const enriched = [...mergedMap.values()].map((item) =>
        enrichOfferingWithLocalBatch(item, allBatches, allParams),
    );

    if (scopedOrgId.length > 0) {
        return enriched.filter((item) => item.organisationId === scopedOrgId);
    }
    return enriched;
};

export const getOfferingsByOrganisation = async (
    organisationId: string,
): Promise<WineOffering[]> => {
    const trimmed = organisationId.trim();
    if (!trimmed) {
        throw new Error('Missing vineyard identifier.');
    }
    return getOfferings(trimmed);
};

export const createOffering = async (draft: OfferingDraft): Promise<WineOffering> => {
    const price = Math.max(0, Math.round(Number(draft.price) || 0));

    try {
        const response = await fetch('/api/offerings', {
            method: 'POST',
            credentials: 'include',
            headers: jsonHeaders,
            body: JSON.stringify({
                wineId: draft.wineId,
                price,
            }),
        });
        await ensureOk(response);
        const created = readOffering(await response.json());

        const extraMetadata: Partial<WineOffering> = {
            ...(draft.imageUrl !== undefined ? { imageUrl: draft.imageUrl } : {}),
            ...(draft.organisationName ? { organisationName: draft.organisationName } : {}),
            ...(draft.wineDescription ? { wineDescription: draft.wineDescription.trim() } : {}),
            ...(draft.vintageYear !== undefined ? { vintageYear: draft.vintageYear } : {}),
            ...(draft.alcoholPercent !== undefined ? { alcoholPercent: draft.alcoholPercent } : {}),
            ...(draft.wineStyle ? { wineStyle: draft.wineStyle } : {}),
            ...(draft.barrelInfo ? { barrelInfo: draft.barrelInfo } : {}),
            ...(draft.grapeType ? { grapeType: draft.grapeType } : {}),
        };

        if (created.id && Object.keys(extraMetadata).length > 0) {
            const overlay = readOverlay();
            writeOverlay({
                ...overlay,
                updated: {
                    ...overlay.updated,
                    [created.id]: {
                        ...(overlay.updated[created.id] ?? {}),
                        ...extraMetadata,
                    },
                },
            });
        }

        return {
            ...created,
            ...extraMetadata,
            imageUrl: draft.imageUrl ?? created.imageUrl ?? null,
        };
    } catch (error) {
        // Fallback when wineId points to a client-side BOTTLED batch because backend lacks /api/bottlings CRUD
        if (
            error instanceof ApiError &&
            (error.status === 404 || error.status === 400) &&
            draft.wineName
        ) {
            const overlay = readOverlay();
            const localOffering: WineOffering = {
                id: makeId(),
                organisationId: draft.organisationId ?? '',
                organisationName: draft.organisationName,
                wineId: draft.wineId,
                wineName: draft.wineName.trim(),
                wineDescription: draft.wineDescription?.trim() ?? '',
                price,
                imageUrl: draft.imageUrl ?? null,
                vintageYear: draft.vintageYear,
                alcoholPercent: draft.alcoholPercent,
                wineStyle: draft.wineStyle,
                barrelInfo: draft.barrelInfo,
                grapeType: draft.grapeType,
                localOnly: true,
            };
            writeOverlay({
                ...overlay,
                created: [localOffering, ...overlay.created],
            });
            return localOffering;
        }
        throw error;
    }
};

export const updateOffering = async (
    id: string,
    draft: Partial<OfferingDraft>,
): Promise<WineOffering> => {
    const overlay = readOverlay();
    const patch: Partial<WineOffering> = {
        ...(draft.wineId !== undefined ? { wineId: draft.wineId } : {}),
        ...(draft.wineName !== undefined ? { wineName: draft.wineName.trim() } : {}),
        ...(draft.wineDescription !== undefined
            ? { wineDescription: draft.wineDescription.trim() }
            : {}),
        ...(draft.price !== undefined
            ? { price: Math.max(0, Math.round(Number(draft.price) || 0)) }
            : {}),
        ...(draft.imageUrl !== undefined ? { imageUrl: draft.imageUrl } : {}),
    };

    writeOverlay({
        ...overlay,
        updated: {
            ...overlay.updated,
            [id]: {
                ...(overlay.updated[id] ?? {}),
                ...patch,
            },
        },
    });

    const list = await getOfferings();
    const updated = list.find((item) => item.id === id);
    if (!updated) {
        throw new Error('Offering not found.');
    }
    return updated;
};

export const deleteOffering = async (id: string): Promise<void> => {
    const overlay = readOverlay();
    writeOverlay({
        ...overlay,
        created: overlay.created.filter((item) => item.id !== id),
        deletedIds: [...new Set([...overlay.deletedIds, id])],
    });
};

const collectUpstreamBatches = (
    root: ProductionBatch,
    allBatches: ProductionBatch[],
): ProductionBatch[] => {
    const visited = new Set<string>();
    const chain: ProductionBatch[] = [];
    const visit = (batch: ProductionBatch) => {
        if (visited.has(batch.id)) {
            return;
        }
        visited.add(batch.id);
        chain.push(batch);
        for (const src of batch.sources) {
            if (src.sourceType === 'BATCH') {
                const upstream = allBatches.find((b) => b.id === src.sourceId);
                if (upstream) {
                    visit(upstream);
                }
            }
        }
    };
    visit(root);
    return chain;
};

export const getCustomerBottleDetails = async (id: string): Promise<CustomerBottleDetails> => {
    const overlay = readOverlay();
    let offering: WineOffering | null =
        overlay.created.find((item) => item.id === id) ?? null;

    if (!offering) {
        try {
            const res = await fetch(`/api/offerings/${encodeURIComponent(id)}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (res.ok) {
                offering = readOffering(await res.json());
            }
        } catch {
            offering = null;
        }
    }

    if (offering && overlay.updated[offering.id]) {
        offering = { ...offering, ...overlay.updated[offering.id] };
    }

    let historyPayload: BatchHistoryApiPayload | null = null;
    if (offering && !offering.localOnly) {
        try {
            const histRes = await fetch(
                `/api/offerings/${encodeURIComponent(offering.id)}/history`,
                {
                    method: 'GET',
                    credentials: 'include',
                },
            );
            if (histRes.ok) {
                historyPayload = (await histRes.json()) as BatchHistoryApiPayload;
            }
        } catch {
            historyPayload = null;
        }
    }

    const [allBatches, allParams, catalogue] = await Promise.all([
        getBatches().catch(() => []),
        getAllParameters().catch(() => []),
        getIngredients().catch(() => []),
    ]);

    const matchedBatch =
        allBatches.find((b) => b.id === (offering?.wineId ?? id)) ??
        (historyPayload?.batch?.id
            ? allBatches.find((b) => b.id === historyPayload?.batch?.id)
            : undefined) ??
        (offering
            ? allBatches.find(
                  (b) =>
                      b.stage === 'BOTTLED' &&
                      b.name.toLowerCase() === offering.wineName.toLowerCase(),
              )
            : undefined);

    if (!offering && !matchedBatch) {
        throw new Error('Wine bottle details could not be found.');
    }

    const chain = matchedBatch ? collectUpstreamBatches(matchedBatch, allBatches) : [];
    const mustBatch = chain.find((b) => b.stage === 'MUST');
    const fermBatch = chain.find((b) => b.stage === 'FERMENTING');
    const agedBatch = chain.find((b) => b.stage === 'AGED');

    const latestParam = matchedBatch
        ? allParams.find((p) => p.batchId === matchedBatch.id) ??
          chain.map((b) => allParams.find((p) => p.batchId === b.id)).find(Boolean)
        : undefined;

    const abv =
        latestParam?.alcoholContent ??
        offering?.alcoholPercent ??
        (matchedBatch
            ? calculatePredictedAlcohol({
                  volumeLiters: matchedBatch.quantity,
                  juiceSugarGL: latestParam?.sugarLevel ?? 200,
                  addedSugarGrams: 0,
                  yeastId: matchedBatch.yeastId,
              }).predictedAbv
            : 12.5);

    const residualSugar = latestParam?.sugarLevel ?? 3.5;

    const nutrients: NutrientProfile =
        matchedBatch?.nutrientsOverride ??
        calculateWineNutrients({
            volumeLiters: matchedBatch?.quantity ?? 100,
            alcoholPercent: abv,
            residualSugarGL: residualSugar,
            ingredients: (matchedBatch?.ingredients ?? []).map((bi) => {
                const cat = catalogue.find((c) => c.id === bi.ingredientId);
                return {
                    name: bi.ingredientName,
                    quantityGrams: bi.quantityGrams,
                    energyContent: cat?.energyContent ?? 0,
                    fat: cat?.fat ?? 0,
                    saturatedFattyAcids: cat?.saturatedFattyAcids ?? 0,
                    carbs: cat?.carbs ?? 0,
                    sugars: cat?.sugars ?? 0,
                    protein: cat?.protein ?? 0,
                    salt: cat?.salt ?? 0,
                    fibers: cat?.fibers ?? 0,
                };
            }),
        });

    const harvestSourceLabels = chain
        .flatMap((b) => b.sources.filter((s) => s.sourceType === 'HARVEST'))
        .map((s) => s.label);
    const harvestDateMatch = harvestSourceLabels.join(' ').match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const grapeMatch = harvestSourceLabels
        .join(' ')
        .match(
            /\b(Solaris|Regent|Rondo|Johanniter|Seyval Blanc|Muscaris|Cabernet Cortis|Hibernal|Riesling|Chardonnay|Pinot Noir|Merlot)\b/i,
        )?.[0];

    const bottledDate = (
        matchedBatch?.createdAt ??
        historyPayload?.batch?.createdAt ??
        new Date().toISOString()
    ).slice(0, 10);

    let barrelDuration: string | null = null;
    if (agedBatch) {
        const startMs = Date.parse(agedBatch.createdAt);
        const endMs = Date.parse(bottledDate);
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
            const days = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
            barrelDuration =
                days >= 30 ? `${Math.round((days / 30) * 10) / 10} month(s) (${days} days)` : `${days} day(s)`;
        } else {
            barrelDuration = 'Maturated in cellar';
        }
    }

    const orgId = offering?.organisationId ?? '';

    return {
        offeringId: offering?.id ?? matchedBatch!.id,
        wineId: offering?.wineId ?? matchedBatch?.id ?? id,
        wineName: offering?.wineName ?? matchedBatch?.name ?? 'Estate Reserve',
        vineyardName: offering?.organisationName || 'Estate Vineyard & Winery',
        organisationId: orgId,
        logoUrl: orgId ? getOrganisationLogoByIdUrl(orgId) : null,
        imageUrl: offering?.imageUrl ?? null,
        description:
            offering?.wineDescription ||
            matchedBatch?.description ||
            'Crafted from estate-grown grapes with full vineyard-to-bottle traceability.',
        price: offering ? offering.price : null,
        wineStyle: offering?.wineStyle ?? inferStyleFromSugar(latestParam?.sugarLevel),
        vintageYear: offering?.vintageYear ?? (Number(bottledDate.slice(0, 4)) || 2026),
        grapeVariety: grapeMatch ?? offering?.grapeType ?? 'Estate Grape Selection',
        harvestDate: harvestDateMatch ?? mustBatch?.createdAt.slice(0, 10) ?? bottledDate,
        fermentationStart: fermBatch ? fermBatch.createdAt.slice(0, 10) : null,
        fermentationEnd:
            fermBatch && (agedBatch || matchedBatch)
                ? (agedBatch?.createdAt ?? matchedBatch!.createdAt).slice(0, 10)
                : null,
        barrelType: agedBatch ? agedBatch.equipmentLabel : offering?.barrelInfo ?? null,
        barrelDuration,
        bottledDate,
        parameters: {
            sugarLevel: latestParam?.sugarLevel ?? residualSugar,
            acidity: latestParam?.acidity ?? 6.2,
            pH: latestParam?.pH ?? 3.35,
            alcoholContent: abv,
        },
        nutrients,
    };
};

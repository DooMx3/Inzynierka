import type { BatchStage, ProductionBatch } from '$lib/api/batches';

export const WINERY_EQUIPMENT_TYPES = [
    'Press',
    'Fermentor',
    'Barrel',
    'Tank',
    'Mixer',
    'Bottling line',
] as const;

export type WineryEquipmentType = (typeof WINERY_EQUIPMENT_TYPES)[number];

const normalizeType = (type: string): string => type.trim().toLowerCase();

export const isWineryEquipmentType = (type: string): boolean => {
    const normalized = normalizeType(type);
    return WINERY_EQUIPMENT_TYPES.some((preset) => preset.toLowerCase() === normalized);
};

export const stageForWineryEquipmentType = (type: string): BatchStage | null => {
    const normalized = normalizeType(type);
    switch (normalized) {
        case 'press':
            return 'MUST';
        case 'fermentor':
            return 'FERMENTING';
        case 'barrel':
        case 'tank':
            return 'AGED';
        case 'mixer':
            return 'BLENDED';
        case 'bottling line':
            return 'BOTTLED';
        default:
            return null;
    }
};

export const routeForBatchStage = (stage: BatchStage): string => {
    switch (stage) {
        case 'MUST':
            return '/vinery/must';
        case 'FERMENTING':
            return '/vinery/fermenting';
        case 'AGED':
            return '/vinery/aged';
        case 'BLENDED':
            return '/vinery/blended';
        case 'BOTTLED':
            return '/packed-products';
    }
};

export type EquipmentQrResolution =
    | {
          kind: 'occupied';
          batch: ProductionBatch;
          stage: BatchStage;
          url: string;
      }
    | {
          kind: 'empty';
          stage: BatchStage;
          url: string;
      }
    | {
          kind: 'unsupported';
          reason: string;
      };

export const resolveEquipmentQrDestination = (
    equipment: { id: string; type: string },
    batches: ProductionBatch[],
): EquipmentQrResolution => {
    const activeBatch = batches.find((batch) => batch.equipmentId === equipment.id);
    if (activeBatch) {
        const basePath = routeForBatchStage(activeBatch.stage);
        const params = new URLSearchParams({
            equipmentId: equipment.id,
            highlightBatchId: activeBatch.id,
        });
        return {
            kind: 'occupied',
            batch: activeBatch,
            stage: activeBatch.stage,
            url: `${basePath}?${params.toString()}`,
        };
    }

    const mappedStage = stageForWineryEquipmentType(equipment.type);
    if (!mappedStage) {
        return {
            kind: 'unsupported',
            reason: `Equipment type "${equipment.type}" is not a winery production vessel.`,
        };
    }

    const basePath = routeForBatchStage(mappedStage);
    const params = new URLSearchParams({
        equipmentId: equipment.id,
        create: '1',
    });
    return {
        kind: 'empty',
        stage: mappedStage,
        url: `${basePath}?${params.toString()}`,
    };
};

export const buildEquipmentQrUrl = (origin: string, equipmentId: string): string =>
    `${origin.replace(/\/$/, '')}/qr/equipment/${encodeURIComponent(equipmentId)}`;

export const buildBottleQrUrl = (origin: string, offeringId: string): string =>
    `${origin.replace(/\/$/, '')}/offerings/${encodeURIComponent(offeringId)}`;

export const buildVineyardOfferingsUrl = (origin: string, organisationId: string): string =>
    `${origin.replace(/\/$/, '')}/offerings/vineyard/${encodeURIComponent(organisationId)}`;


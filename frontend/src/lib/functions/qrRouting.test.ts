import { describe, it, expect } from 'bun:test';
import type { ProductionBatch } from '$lib/api/batches';
import {
    buildBottleQrUrl,
    buildEquipmentQrUrl,
    isWineryEquipmentType,
    resolveEquipmentQrDestination,
    routeForBatchStage,
    stageForWineryEquipmentType,
} from './qrRouting';

const sampleBatch: ProductionBatch = {
    id: 'batch-99',
    batchNumber: 'BATCH-1099',
    name: 'Solaris Oak Reserve',
    stage: 'AGED',
    quantity: 220,
    equipmentId: 'eq-barrel-1',
    equipmentLabel: 'Oak Barrel #1 (Barrel)',
    createdAt: '2026-10-01T10:00:00.000Z',
    isSpoiled: false,
    yeastId: 'EC1118',
    description: '',
    sources: [],
    ingredients: [],
    nutrientsOverride: null,
};

describe('QR routing helpers', () => {
    it('identifies only winery equipment types', () => {
        expect(isWineryEquipmentType('Fermentor')).toBe(true);
        expect(isWineryEquipmentType('barrel')).toBe(true);
        expect(isWineryEquipmentType('Bottling line')).toBe(true);
        expect(isWineryEquipmentType('Tractor')).toBe(false);
        expect(isWineryEquipmentType('Sprayer')).toBe(false);
        expect(isWineryEquipmentType('Custom Tool')).toBe(false);
    });

    it('maps winery equipment types to production stages and routes', () => {
        expect(stageForWineryEquipmentType('Press')).toBe('MUST');
        expect(stageForWineryEquipmentType('Fermentor')).toBe('FERMENTING');
        expect(stageForWineryEquipmentType('Barrel')).toBe('AGED');
        expect(stageForWineryEquipmentType('Tank')).toBe('AGED');
        expect(stageForWineryEquipmentType('Mixer')).toBe('BLENDED');
        expect(stageForWineryEquipmentType('Bottling line')).toBe('BOTTLED');
        expect(stageForWineryEquipmentType('Tractor')).toBeNull();

        expect(routeForBatchStage('MUST')).toBe('/vinery/must');
        expect(routeForBatchStage('BOTTLED')).toBe('/packed-products');
    });

    it('routes occupied equipment to its active batch stage with highlight params', () => {
        const resolved = resolveEquipmentQrDestination(
            { id: 'eq-barrel-1', type: 'Barrel' },
            [sampleBatch],
        );
        expect(resolved.kind).toBe('occupied');
        if (resolved.kind === 'occupied') {
            expect(resolved.stage).toBe('AGED');
            expect(resolved.url).toBe(
                '/vinery/aged?equipmentId=eq-barrel-1&highlightBatchId=batch-99',
            );
        }
    });

    it('routes empty winery equipment directly to the matching stage creator', () => {
        const resolved = resolveEquipmentQrDestination({ id: 'eq-ferm-2', type: 'Fermentor' }, [
            sampleBatch,
        ]);
        expect(resolved).toEqual({
            kind: 'empty',
            stage: 'FERMENTING',
            url: '/vinery/fermenting?equipmentId=eq-ferm-2&create=1',
        });

        const bottlingResolved = resolveEquipmentQrDestination(
            { id: 'eq-bot-1', type: 'Bottling line' },
            [],
        );
        expect(bottlingResolved).toEqual({
            kind: 'empty',
            stage: 'BOTTLED',
            url: '/packed-products?equipmentId=eq-bot-1&create=1',
        });
    });

    it('marks non-winery equipment without batches as unsupported', () => {
        const resolved = resolveEquipmentQrDestination({ id: 'eq-trac-1', type: 'Tractor' }, []);
        expect(resolved.kind).toBe('unsupported');
    });

    it('builds canonical QR code URLs for equipment and bottles', () => {
        expect(buildEquipmentQrUrl('https://vineyard.local/', 'eq-1')).toBe(
            'https://vineyard.local/qr/equipment/eq-1',
        );
        expect(buildBottleQrUrl('https://vineyard.local', 'off-42')).toBe(
            'https://vineyard.local/offerings/off-42',
        );
    });
});

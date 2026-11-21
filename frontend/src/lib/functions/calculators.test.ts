import { describe, it, expect } from 'bun:test';
import {
    calculatePotassiumMetabisulfite,
    calculatePredictedAlcohol,
    calculateWineNutrients,
    kcalToKj,
    recommendedFreeSo2ForPh,
} from './calculators';

describe('oenological calculators', () => {
    it('calculates potassium metabisulfite dosage and exposes explicit formula', () => {
        const result = calculatePotassiumMetabisulfite({
            volumeLiters: 100,
            currentFreeSo2MgL: 10,
            targetFreeSo2MgL: 67.6,
        });

        // (57.6 mg/L * 100 L) / (0.576 * 1000) = 10 g
        expect(result.requiredFreeSo2MgL).toBe(57.6);
        expect(result.gramsPotassiumMetabisulfite).toBe(10);
        expect(result.formula).toContain('0.576 × 1000');
    });

    it('recommends higher free SO2 at higher pH', () => {
        const lowPh = recommendedFreeSo2ForPh(3.1, true);
        const highPh = recommendedFreeSo2ForPh(3.7, true);
        expect(highPh).toBeGreaterThan(lowPh);
    });

    it('predicts alcohol from juice + added sugar, caps at yeast tolerance, and computes sugar needed', () => {
        const normal = calculatePredictedAlcohol({
            juiceSugarGL: 180,
            addedSugarGrams: 2000,
            volumeLiters: 100,
            yeastId: 'EC1118',
            desiredAbvPercent: 13,
        });

        // 180 + 20 = 200 g/L -> 200 / 16.83 = 11.88%
        expect(normal.totalSugarGL).toBe(200);
        expect(normal.predictedAbv).toBeCloseTo(11.88, 1);
        expect(normal.cappedByYeast).toBe(false);
        expect(normal.requiredAddedSugarGrams).toBeGreaterThan(3800);

        const capped = calculatePredictedAlcohol({
            juiceSugarGL: 260,
            volumeLiters: 100,
            yeastId: 'WILD',
        });
        expect(capped.cappedByYeast).toBe(true);
        expect(capped.predictedAbv).toBe(12.5);
    });

    it('calculates wine nutrients per 100 ml from ABV, residual sugar, and ingredients', () => {
        const nutrients = calculateWineNutrients({
            volumeLiters: 100,
            alcoholPercent: 12.5,
            residualSugarGL: 8,
            ingredients: [
                {
                    name: 'Yeast hulls',
                    quantityGrams: 200,
                    energyContent: 300,
                    fat: 5,
                    saturatedFattyAcids: 1,
                    carbs: 30,
                    sugars: 0,
                    protein: 45,
                    salt: 0.5,
                    fibers: 20,
                },
            ],
        });

        expect(nutrients.sugars).toBe(0.8);
        expect(nutrients.carbs).toBeGreaterThanOrEqual(0.8);
        expect(nutrients.energyKcal).toBeGreaterThan(65);
        expect(kcalToKj(75)).toBe(314);
    });
});

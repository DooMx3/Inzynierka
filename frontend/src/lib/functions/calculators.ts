export type YeastStrain = {
    id: string;
    label: string;
    gramsSugarPerPercentAbv: number;
    maxAbvTolerance: number;
};

export const YEAST_STRAINS: YeastStrain[] = [
    {
        id: 'EC1118',
        label: 'Lalvin EC-1118 (Champagne / Dry, up to 18%)',
        gramsSugarPerPercentAbv: 16.83,
        maxAbvTolerance: 18.0,
    },
    {
        id: 'BAYANUS',
        label: 'Saccharomyces bayanus (Aromatic, up to 16%)',
        gramsSugarPerPercentAbv: 16.83,
        maxAbvTolerance: 16.0,
    },
    {
        id: 'COTE_BLANCS',
        label: 'Côte des Blancs (Fruity White, up to 14%)',
        gramsSugarPerPercentAbv: 17.0,
        maxAbvTolerance: 14.0,
    },
    {
        id: 'RC212',
        label: 'Bourgovin RC-212 (Red Pinot/Regent, up to 15.5%)',
        gramsSugarPerPercentAbv: 16.9,
        maxAbvTolerance: 15.5,
    },
    {
        id: 'WILD',
        label: 'Indigenous / Wild Yeast (up to 12.5%)',
        gramsSugarPerPercentAbv: 17.2,
        maxAbvTolerance: 12.5,
    },
];

export type NutrientProfile = {
    energyKcal: number;
    fat: number;
    saturatedFattyAcids: number;
    carbs: number;
    sugars: number;
    protein: number;
    salt: number;
    fibers: number;
};

export type IngredientNutrientsInput = {
    name: string;
    quantityGrams: number;
    energyContent: number;
    fat: number;
    saturatedFattyAcids: number;
    carbs: number;
    sugars: number;
    protein: number;
    salt: number;
    fibers: number;
};

export type PotassiumCalculationInput = {
    volumeLiters: number;
    currentFreeSo2MgL?: number;
    targetFreeSo2MgL?: number;
    pH?: number | null;
    stopFermentation?: boolean;
};

export type PotassiumCalculationResult = {
    effectiveTargetFreeSo2MgL: number;
    requiredFreeSo2MgL: number;
    gramsPotassiumMetabisulfite: number;
    formula: string;
};

export type PredictedAlcoholInput = {
    juiceSugarGL: number;
    addedSugarGrams?: number;
    volumeLiters: number;
    yeastId?: string;
    desiredAbvPercent?: number;
};

export type PredictedAlcoholResult = {
    totalSugarGL: number;
    rawPotentialAbv: number;
    predictedAbv: number;
    cappedByYeast: boolean;
    yeast: YeastStrain;
    requiredAddedSugarGrams: number;
    formula: string;
};

const roundTo = (value: number, decimals = 2): number => {
    const factor = 10 ** decimals;
    return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
};

/**
 * Recommends free SO2 (mg/L) from wine pH using molecular SO2 equilibrium (pKa1 = 1.81).
 * Stopping active fermentation uses a higher molecular SO2 target (1.5 mg/L, clamped to 60..160 mg/L)
 * than standard aging stabilization (0.8 mg/L, clamped to 25..120 mg/L).
 */
export const recommendedFreeSo2ForPh = (
    pH: number,
    stopFermentation = true,
): number => {
    const clampedPh = Math.min(Math.max(pH, 2.8), 4.2);
    const molecularTarget = stopFermentation ? 1.5 : 0.8;
    const freeSo2 = molecularTarget * (1 + 10 ** (clampedPh - 1.81));
    const min = stopFermentation ? 60 : 25;
    const max = stopFermentation ? 160 : 120;
    return roundTo(Math.min(Math.max(freeSo2, min), max), 1);
};

export const calculatePotassiumMetabisulfite = (
    input: PotassiumCalculationInput,
): PotassiumCalculationResult => {
    const volume = Math.max(0, input.volumeLiters);
    const currentSo2 = Math.max(0, input.currentFreeSo2MgL ?? 0);
    const stopFermentation = input.stopFermentation ?? true;

    const autoTarget =
        input.pH != null && Number.isFinite(input.pH) && input.pH > 0
            ? recommendedFreeSo2ForPh(input.pH, stopFermentation)
            : stopFermentation
              ? 80
              : 45;

    const effectiveTargetFreeSo2MgL =
        input.targetFreeSo2MgL != null && Number.isFinite(input.targetFreeSo2MgL)
            ? Math.max(0, input.targetFreeSo2MgL)
            : autoTarget;

    const requiredFreeSo2MgL = roundTo(Math.max(0, effectiveTargetFreeSo2MgL - currentSo2), 2);
    // K2S2O5 yields 57.6% active SO2 by mass -> grams = (mg/L * L) / (0.576 * 1000)
    const grams = (requiredFreeSo2MgL * volume) / (0.576 * 1000);

    return {
        effectiveTargetFreeSo2MgL,
        requiredFreeSo2MgL,
        gramsPotassiumMetabisulfite: roundTo(grams, 2),
        formula: `K2S2O5 [g] = ((${effectiveTargetFreeSo2MgL} - ${currentSo2}) mg/L × ${volume} L) / (0.576 × 1000)`,
    };
};

export const calculatePredictedAlcohol = (
    input: PredictedAlcoholInput,
): PredictedAlcoholResult => {
    const yeast =
        YEAST_STRAINS.find((item) => item.id === input.yeastId) ?? YEAST_STRAINS[0]!;
    const volume = Math.max(0, input.volumeLiters);
    const juiceSugar = Math.max(0, input.juiceSugarGL);
    const addedSugarGrams = Math.max(0, input.addedSugarGrams ?? 0);
    const addedSugarGL = volume > 0 ? addedSugarGrams / volume : 0;

    const totalSugarGL = roundTo(juiceSugar + addedSugarGL, 2);
    const rawPotentialAbv = roundTo(totalSugarGL / yeast.gramsSugarPerPercentAbv, 2);
    const cappedByYeast = rawPotentialAbv > yeast.maxAbvTolerance;
    const predictedAbv = roundTo(Math.min(rawPotentialAbv, yeast.maxAbvTolerance), 2);

    const desiredAbv = Math.max(0, input.desiredAbvPercent ?? 0);
    const effectiveDesiredAbv = Math.min(desiredAbv, yeast.maxAbvTolerance);
    const neededTotalSugarGL = effectiveDesiredAbv * yeast.gramsSugarPerPercentAbv;
    const missingSugarGL = Math.max(0, neededTotalSugarGL - juiceSugar);
    const requiredAddedSugarGrams = roundTo(missingSugarGL * volume, 1);

    return {
        totalSugarGL,
        rawPotentialAbv,
        predictedAbv,
        cappedByYeast,
        yeast,
        requiredAddedSugarGrams,
        formula: `ABV [%] = min(${yeast.maxAbvTolerance}%, (${juiceSugar} g/L + ${roundTo(addedSugarGL, 2)} g/L) / ${yeast.gramsSugarPerPercentAbv})`,
    };
};

export const calculateWineNutrients = (params: {
    volumeLiters: number;
    alcoholPercent: number;
    residualSugarGL: number;
    ingredients?: IngredientNutrientsInput[];
}): NutrientProfile => {
    const volumeMl = Math.max(100, params.volumeLiters * 1000);
    const alcoholPercent = Math.max(0, params.alcoholPercent);
    const residualSugarGL = Math.max(0, params.residualSugarGL);

    // Ethanol density = 0.789 g/ml -> grams of ethanol per 100 ml = ABV * 0.789 (7 kcal/g)
    const alcoholGramsPer100Ml = alcoholPercent * 0.789;
    const alcoholKcalPer100Ml = alcoholGramsPer100Ml * 7;

    // Residual sugar in finished wine (g/L -> g/100ml = / 10), plus ~0.6 g/100ml glycerol/organic extract carbs
    const sugarPer100Ml = residualSugarGL / 10;
    const baseGlycerolCarbs = alcoholPercent > 0 ? roundTo(alcoholPercent * 0.05, 2) : 0;

    let fat = 0;
    let saturatedFattyAcids = 0;
    let extraCarbs = 0;
    let protein = 0;
    let salt = 0;
    let fibers = 0;

    for (const item of params.ingredients ?? []) {
        if (item.quantityGrams <= 0) {
            continue;
        }
        // Ratio of ingredient per 100 ml of batch; exclude fermentable sucrose from residual sugars since residualSugarGL already reflects post-fermentation sugar
        const factorPer100Ml = item.quantityGrams / volumeMl;
        const isPureSugar =
            item.sugars >= 95 && item.protein === 0 && item.fat === 0 && alcoholPercent > 0;

        fat += item.fat * factorPer100Ml;
        saturatedFattyAcids += item.saturatedFattyAcids * factorPer100Ml;
        if (!isPureSugar) {
            extraCarbs += Math.max(0, item.carbs - item.sugars) * factorPer100Ml;
        }
        protein += item.protein * factorPer100Ml;
        salt += item.salt * factorPer100Ml;
        fibers += item.fibers * factorPer100Ml;
    }

    const totalSugars = roundTo(sugarPer100Ml, 1);
    const totalCarbs = roundTo(sugarPer100Ml + baseGlycerolCarbs + extraCarbs, 1);
    const totalFat = roundTo(fat, 1);
    const totalSatFat = roundTo(saturatedFattyAcids, 1);
    const totalProtein = roundTo(protein, 1);
    const totalSalt = roundTo(salt, 2);
    const totalFibers = roundTo(fibers, 1);

    const energyKcal = roundTo(
        alcoholKcalPer100Ml +
            totalCarbs * 4 +
            totalProtein * 4 +
            totalFat * 9 +
            totalFibers * 2,
        1,
    );

    return {
        energyKcal,
        fat: totalFat,
        saturatedFattyAcids: totalSatFat,
        carbs: totalCarbs,
        sugars: totalSugars,
        protein: totalProtein,
        salt: totalSalt,
        fibers: totalFibers,
    };
};

export const kcalToKj = (kcal: number): number => Math.round(kcal * 4.184);

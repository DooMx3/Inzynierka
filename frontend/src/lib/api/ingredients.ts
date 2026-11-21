const STORAGE_KEY = 'wms_ingredients_catalogue_v1';
const COUNTER_KEY = 'wms_ingredients_counter_v1';

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

export const SEED_INGREDIENTS: Ingredient[] = [
    {
        id: 'ing-sucrose',
        number: 'ING-001',
        name: 'Sucrose (Chaptalization sugar)',
        energyContent: 400,
        fat: 0,
        saturatedFattyAcids: 0,
        carbs: 100,
        sugars: 100,
        protein: 0,
        salt: 0,
        fibers: 0,
    },
    {
        id: 'ing-k2s2o5',
        number: 'ING-002',
        name: 'Potassium metabisulfite (K2S2O5)',
        energyContent: 0,
        fat: 0,
        saturatedFattyAcids: 0,
        carbs: 0,
        sugars: 0,
        protein: 0,
        salt: 0,
        fibers: 0,
    },
    {
        id: 'ing-yeast-ec1118',
        number: 'ING-003',
        name: 'Wine yeast (Lalvin EC-1118)',
        energyContent: 325,
        fat: 5,
        saturatedFattyAcids: 1,
        carbs: 40,
        sugars: 0,
        protein: 40,
        salt: 0.4,
        fibers: 27,
    },
    {
        id: 'ing-tartaric',
        number: 'ING-004',
        name: 'Tartaric acid',
        energyContent: 200,
        fat: 0,
        saturatedFattyAcids: 0,
        carbs: 0,
        sugars: 0,
        protein: 0,
        salt: 0,
        fibers: 0,
    },
    {
        id: 'ing-water',
        number: 'ING-005',
        name: 'Water',
        energyContent: 0,
        fat: 0,
        saturatedFattyAcids: 0,
        carbs: 0,
        sugars: 0,
        protein: 0,
        salt: 0,
        fibers: 0,
    },
];

const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStore = (): Ingredient[] => {
    if (typeof localStorage === 'undefined') {
        return [...SEED_INGREDIENTS];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INGREDIENTS));
        localStorage.setItem(COUNTER_KEY, '6');
        return [...SEED_INGREDIENTS];
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Ingredient[]) : [...SEED_INGREDIENTS];
    } catch {
        return [...SEED_INGREDIENTS];
    }
};

const writeStore = (items: Ingredient[]) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
};

const nextNumber = (): string => {
    if (typeof localStorage === 'undefined') {
        return 'ING-999';
    }
    const current = Number(localStorage.getItem(COUNTER_KEY) ?? '6') || 6;
    localStorage.setItem(COUNTER_KEY, String(current + 1));
    return `ING-${String(current).padStart(3, '0')}`;
};

const sanitizeDraft = (draft: IngredientDraft): IngredientDraft => ({
    name: draft.name.trim(),
    energyContent: Math.max(0, Number(draft.energyContent) || 0),
    fat: Math.max(0, Number(draft.fat) || 0),
    saturatedFattyAcids: Math.max(0, Number(draft.saturatedFattyAcids) || 0),
    carbs: Math.max(0, Number(draft.carbs) || 0),
    sugars: Math.max(0, Number(draft.sugars) || 0),
    protein: Math.max(0, Number(draft.protein) || 0),
    salt: Math.max(0, Number(draft.salt) || 0),
    fibers: Math.max(0, Number(draft.fibers) || 0),
});

export const getIngredients = async (): Promise<Ingredient[]> => {
    return readStore();
};

export const createIngredient = async (draft: IngredientDraft): Promise<Ingredient> => {
    const clean = sanitizeDraft(draft);
    if (!clean.name) {
        throw new Error('Ingredient name is required.');
    }
    const items = readStore();
    const created: Ingredient = {
        id: makeId(),
        number: nextNumber(),
        ...clean,
    };
    writeStore([...items, created]);
    return created;
};

export const updateIngredient = async (
    id: string,
    draft: IngredientDraft,
): Promise<Ingredient> => {
    const clean = sanitizeDraft(draft);
    if (!clean.name) {
        throw new Error('Ingredient name is required.');
    }
    const items = readStore();
    const existing = items.find((item) => item.id === id);
    if (!existing) {
        throw new Error('Ingredient not found.');
    }
    const updated: Ingredient = {
        ...existing,
        ...clean,
    };
    writeStore(items.map((item) => (item.id === id ? updated : item)));
    return updated;
};

export const deleteIngredient = async (id: string): Promise<void> => {
    const items = readStore();
    writeStore(items.filter((item) => item.id !== id));
};

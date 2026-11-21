<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import plusIcon from "$lib/assets/plus.svg?raw";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import PotassiumCalculatorModal from "$lib/components/calculators/potassiumCalculatorModal.svelte";
    import PredictedAlcoholModal from "$lib/components/calculators/predictedAlcoholModal.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import NutrientsTableModal from "$lib/components/nutrients/nutrientsTableModal.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import TextareaField from "$lib/components/textareaField/textareaField.svelte";
    import BatchIngredientsModal from "./batchIngredientsModal.svelte";
    import ChemicalParameterModal from "./chemicalParameterModal.svelte";
    import ChemicalParametersTable from "./chemicalParametersTable.svelte";
    import {
        ALLOWED_SOURCE_STAGES,
        createBatch,
        deleteBatch,
        getBatches,
        setBatchIngredients,
        setBatchNutrients,
        setBatchSpoiled,
        STAGE_LABELS,
        updateBatch,
        type BatchIngredientItem,
        type BatchSourceItem,
        type BatchStage,
        type ProductionBatch,
    } from "$lib/api/batches";
    import { getEquipmentList, type Equipment } from "$lib/api/equipment";
    import { getHarvests, type HarvestRecord } from "$lib/api/harvests";
    import { getIngredients, type Ingredient } from "$lib/api/ingredients";
    import {
        createBatchParameter,
        deleteBatchParameter,
        getAllParameters,
        updateBatchParameter,
        type ChemicalParameterDraft,
        type ChemicalParameterRecord,
    } from "$lib/api/parameters";
    import {
        calculatePredictedAlcohol,
        calculateWineNutrients,
        YEAST_STRAINS,
        type NutrientProfile,
    } from "$lib/functions/calculators";
    import { session } from "$lib/stores/session.svelte";

    let {
        stage,
    }: {
        stage: BatchStage;
    } = $props();

    type SourceRowDraft = {
        id: string;
        sourceId: string;
        quantityStr: string | number | null;
    };

    let allBatches = $state<ProductionBatch[]>([]);
    let equipmentList = $state<Equipment[]>([]);
    let harvests = $state<HarvestRecord[]>([]);
    let catalogue = $state<Ingredient[]>([]);
    let allParameters = $state<ChemicalParameterRecord[]>([]);

    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("number");
    let filter = $state("all");

    let formOpen = $state(false);
    let confirmBatchSaveOpen = $state(false);
    let editingBatch = $state<ProductionBatch | null>(null);
    let formName = $state("");
    let formQuantity = $state<string | number | null>("");
    let formEquipmentId = $state("");
    let formYeastId = $state("EC1118");
    let formDescription = $state("");
    let formSources = $state<SourceRowDraft[]>([]);
    let formIngredients = $state<BatchIngredientItem[]>([]);
    let formIngredientsOpen = $state(false);
    let formError = $state("");
    let showValidation = $state(false);

    let deletingBatch = $state<ProductionBatch | null>(null);
    let spoilToggleTarget = $state<{ batch: ProductionBatch; nextSpoiled: boolean } | null>(null);

    let paramModalTarget = $state<{
        batch: ProductionBatch;
        record: ChemicalParameterRecord | null;
    } | null>(null);
    let deletingParam = $state<ChemicalParameterRecord | null>(null);

    let ingredientsModalBatch = $state<ProductionBatch | null>(null);
    let potassiumModalBatch = $state<ProductionBatch | null>(null);
    let alcoholModalBatch = $state<ProductionBatch | null>(null);
    let nutrientsModalBatch = $state<ProductionBatch | null>(null);

    const canAccess = $derived(
        Boolean(session.user?.roles.some((role) => role === "OENOLOGIST" || role === "OWNER")),
    );
    const stageTitle = $derived(STAGE_LABELS[stage]);
    const qrEquipmentId = $derived(page.url.searchParams.get("equipmentId") ?? "");

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [loadedBatches, loadedIngredients, loadedParams] = await Promise.all([
                getBatches(),
                getIngredients(),
                getAllParameters(),
            ]);
            allBatches = loadedBatches;
            catalogue = loadedIngredients;
            allParameters = loadedParams;

            try {
                equipmentList = await getEquipmentList();
            } catch {
                equipmentList = [];
            }

            if (stage === "MUST") {
                try {
                    harvests = await getHarvests();
                } catch {
                    harvests = [];
                }
            }
        } catch (error) {
            loadError = error instanceof Error ? error.message : "Could not load batches.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!canAccess) {
            loading = false;
            return;
        }
        void load();
    });

    const stageBatches = $derived(allBatches.filter((b) => b.stage === stage));

    const paramsByBatchId = $derived.by(() => {
        const grouped: Record<string, ChemicalParameterRecord[]> = {};
        for (const rec of allParameters) {
            const list = grouped[rec.batchId] ?? [];
            list.push(rec);
            grouped[rec.batchId] = list;
        }
        return grouped;
    });

    const latestParamFor = (batchId: string): ChemicalParameterRecord | undefined =>
        paramsByBatchId[batchId]?.[0];

    const addedSugarGramsFor = (batch: ProductionBatch): number => {
        let grams = 0;
        for (const item of batch.ingredients) {
            const cat = catalogue.find((c) => c.id === item.ingredientId);
            if ((cat && cat.sugars >= 95) || item.ingredientName.toLowerCase().includes("sucrose")) {
                grams += item.quantityGrams;
            }
        }
        return grams;
    };

    const predictedAbvFor = (batch: ProductionBatch): number => {
        const latest = latestParamFor(batch.id);
        if (latest?.alcoholContent != null && latest.alcoholContent > 0) {
            return latest.alcoholContent;
        }
        const initialSugar = latest?.sugarLevel ?? 200;
        return calculatePredictedAlcohol({
            volumeLiters: batch.quantity,
            juiceSugarGL: initialSugar,
            addedSugarGrams: addedSugarGramsFor(batch),
            yeastId: batch.yeastId,
        }).predictedAbv;
    };

    const autoNutrientsFor = (batch: ProductionBatch): NutrientProfile => {
        const latest = latestParamFor(batch.id);
        const abv = predictedAbvFor(batch);
        const residualSugar = latest?.sugarLevel ?? 4;
        const enrichedIngredients = batch.ingredients.map((bi) => {
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
        });
        return calculateWineNutrients({
            volumeLiters: batch.quantity,
            alcoholPercent: abv,
            residualSugarGL: residualSugar,
            ingredients: enrichedIngredients,
        });
    };

    const availableSourceOptions = $derived.by(() => {
        if (stage === "MUST") {
            return harvests.map((h) => ({
                value: h.id,
                sourceType: "HARVEST" as const,
                maxQty: h.amountKg,
                label: `Harvest ${h.harvestDate} | ${h.fields.map((f) => f.grapeVarietyName).join(", ") || "Vineyard"} | ${h.amountKg} kg`,
            }));
        }
        const allowed = ALLOWED_SOURCE_STAGES[stage];
        return allBatches
            .filter((b) => allowed.includes(b.stage) && !b.isSpoiled)
            .map((b) => ({
                value: b.id,
                sourceType: "BATCH" as const,
                maxQty: b.quantity,
                label: `${b.batchNumber} | ${b.name} (${STAGE_LABELS[b.stage]}) | ${b.quantity} L`,
            }));
    });

    const equipmentOptions = $derived(
        equipmentList.length > 0
            ? equipmentList.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.type})`,
              }))
            : [
                  { value: "local-press-1", label: "Press #1 (Press)" },
                  { value: "local-ferm-1", label: "Fermentor #1 (Fermentor)" },
                  { value: "local-barrel-1", label: "Oak Barrel #1 (Barrel)" },
                  { value: "local-mixer-1", label: "Mixer #1 (Mixer)" },
                  { value: "local-bottle-1", label: "Bottling Line #1 (Bottling line)" },
              ],
    );

    const visibleBatches = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = stageBatches.filter((batch) => {
            if (qrEquipmentId && batch.equipmentId !== qrEquipmentId) {
                return false;
            }
            if (filter === "spoiled" && !batch.isSpoiled) {
                return false;
            }
            if (filter === "healthy" && batch.isSpoiled) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                batch.batchNumber,
                batch.name,
                batch.equipmentLabel,
                ...batch.sources.map((s) => s.label),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "name") {
                return left.name.localeCompare(right.name);
            }
            if (sort === "quantity") {
                return right.quantity - left.quantity;
            }
            if (sort === "date") {
                return right.createdAt.localeCompare(left.createdAt);
            }
            return right.batchNumber.localeCompare(left.batchNumber);
        });

        return matched;
    });

    const addSourceRow = () => {
        const firstOpt = availableSourceOptions[0];
        formSources = [
            ...formSources,
            {
                id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                sourceId: firstOpt?.value ?? "",
                quantityStr: firstOpt ? String(firstOpt.maxQty) : "50",
            },
        ];
    };

    const removeSourceRow = (id: string) => {
        formSources = formSources.filter((row) => row.id !== id);
    };

    const openCreate = (preselectedEquipmentId = "") => {
        editingBatch = null;
        formName = "";
        formQuantity = "100";
        formEquipmentId = preselectedEquipmentId || qrEquipmentId || equipmentOptions[0]?.value || "";
        formYeastId = "EC1118";
        formDescription = "";
        formIngredients = [];
        formSources =
            availableSourceOptions.length > 0
                ? [
                      {
                          id: `src-init-${Date.now()}`,
                          sourceId: availableSourceOptions[0]!.value,
                          quantityStr: String(availableSourceOptions[0]!.maxQty),
                      },
                  ]
                : [];
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (batch: ProductionBatch) => {
        editingBatch = batch;
        formName = batch.name;
        formQuantity = String(batch.quantity);
        formEquipmentId = batch.equipmentId;
        formYeastId = batch.yeastId || "EC1118";
        formDescription = batch.description || "";
        formIngredients = [...batch.ingredients];
        formSources = batch.sources.map((src, idx) => ({
            id: `src-edit-${idx}`,
            sourceId: src.sourceId,
            quantityStr: String(src.quantity),
        }));
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const requestBatchSave = () => {
        showValidation = true;
        const parsedQty = Number(formQuantity);
        if (!formName.trim()) {
            formError = "Batch name is required.";
            return;
        }
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
            formError = "Quantity must be greater than 0.";
            return;
        }
        if (!formEquipmentId) {
            formError = "Select target equipment / location.";
            return;
        }

        for (const row of formSources) {
            const rowQty = Number(row.quantityStr);
            if (!row.sourceId || !Number.isFinite(rowQty) || rowQty <= 0) {
                formError = "Each source row must select a valid source and positive quantity.";
                return;
            }
            const opt = availableSourceOptions.find((o) => o.value === row.sourceId);
            if (opt && rowQty > opt.maxQty) {
                formError = `Requested quantity (${rowQty}) exceeds available source stock (${opt.maxQty}).`;
                return;
            }
        }

        formError = "";
        confirmBatchSaveOpen = true;
    };

    const executeBatchSave = async () => {
        try {
            const equipOpt = equipmentOptions.find((e) => e.value === formEquipmentId);
            const mappedSources: BatchSourceItem[] = formSources.map((row) => {
                const opt = availableSourceOptions.find((o) => o.value === row.sourceId);
                return {
                    sourceId: row.sourceId,
                    sourceType: opt?.sourceType ?? (stage === "MUST" ? "HARVEST" : "BATCH"),
                    label: opt?.label ?? row.sourceId,
                    quantity: Number(row.quantityStr) || 0,
                };
            });

            const payload = {
                name: formName.trim(),
                stage,
                quantity: Number(formQuantity),
                equipmentId: formEquipmentId,
                equipmentLabel: equipOpt?.label ?? formEquipmentId,
                yeastId: formYeastId,
                description: formDescription.trim(),
                sources: mappedSources,
                ingredients: formIngredients,
            };

            if (editingBatch) {
                await updateBatch(editingBatch.id, payload);
            } else {
                await createBatch(payload);
            }
            confirmBatchSaveOpen = false;
            formOpen = false;
            editingBatch = null;
            await load();
        } catch (error) {
            confirmBatchSaveOpen = false;
            formError = error instanceof Error ? error.message : "Could not save batch.";
        }
    };

    const confirmDeleteBatch = async () => {
        if (!deletingBatch) {
            return;
        }
        await deleteBatch(deletingBatch.id);
        deletingBatch = null;
        await load();
    };

    const confirmSpoilToggle = async () => {
        if (!spoilToggleTarget) {
            return;
        }
        await setBatchSpoiled(spoilToggleTarget.batch.id, spoilToggleTarget.nextSpoiled);
        spoilToggleTarget = null;
        await load();
    };

    const handleSaveParameter = async (draft: ChemicalParameterDraft) => {
        if (!paramModalTarget) {
            return;
        }
        if (paramModalTarget.record) {
            await updateBatchParameter(paramModalTarget.record.id, draft);
        } else {
            await createBatchParameter(paramModalTarget.batch.id, draft);
        }
        paramModalTarget = null;
        await load();
    };

    const confirmDeleteParam = async () => {
        if (!deletingParam) {
            return;
        }
        await deleteBatchParameter(deletingParam.id);
        deletingParam = null;
        await load();
    };

    const handleSaveBatchIngredients = async (items: BatchIngredientItem[]) => {
        if (!ingredientsModalBatch) {
            return;
        }
        await setBatchIngredients(ingredientsModalBatch.id, items);
        ingredientsModalBatch = null;
        await load();
    };

    const handleQuickPotassiumDose = async (grams: number) => {
        if (!potassiumModalBatch) {
            return;
        }
        const k2Ing =
            catalogue.find((c) => c.name.toLowerCase().includes("metabisulfite")) ??
            catalogue[0];
        if (!k2Ing) {
            potassiumModalBatch = null;
            return;
        }
        const existing = potassiumModalBatch.ingredients;
        const idx = existing.findIndex((i) => i.ingredientId === k2Ing.id);
        const updated =
            idx >= 0
                ? existing.map((item, i) =>
                      i === idx ? { ...item, quantityGrams: grams } : item,
                  )
                : [
                      ...existing,
                      {
                          id: `bi-k2-${Date.now()}`,
                          ingredientId: k2Ing.id,
                          ingredientName: k2Ing.name,
                          quantityGrams: grams,
                      },
                  ];
        await setBatchIngredients(potassiumModalBatch.id, updated);
        potassiumModalBatch = null;
        await load();
    };

    const handleSaveNutrients = async (profile: NutrientProfile) => {
        if (!nutrientsModalBatch) {
            return;
        }
        await setBatchNutrients(nutrientsModalBatch.id, profile);
        nutrientsModalBatch = null;
        await load();
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only oenologists and the organisation owner can manage production batches.
        </p>
    {:else}
        {#if qrEquipmentId}
            <div
                class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6b4f3a] bg-[#fbf7f2] px-4 py-3 text-sm text-[#3f2e22]"
            >
                <span>
                    Filtered for scanned equipment: <strong>{qrEquipmentId}</strong>
                </span>
                {#if visibleBatches.length === 0}
                    <div class="w-60">
                        <AddButton
                            text="Create batch here"
                            onClick={() => openCreate(qrEquipmentId)}
                        />
                    </div>
                {/if}
            </div>
        {/if}

        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text={`New ${stageTitle.toLowerCase()} batch`} onClick={() => openCreate()} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel={`What ${stageTitle.toLowerCase()} batch are you looking for?`}
            searchPlaceholder="Search for batch name, number, location..."
            sortOptions={[
                { value: "number", label: "Batch number" },
                { value: "name", label: "Name" },
                { value: "date", label: "Creation date" },
                { value: "quantity", label: "Quantity" },
            ]}
            filterOptions={[
                { value: "all", label: "All batches" },
                { value: "healthy", label: "Healthy only" },
                { value: "spoiled", label: "Spoiled only" },
            ]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading batches...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${stage}|${query}|${sort}|${filter}|${qrEquipmentId}`}
                <ResultsTable
                    rows={visibleBatches}
                    emptyLabel={`No ${stageTitle.toLowerCase()} batches found.`}
                >
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">ID</th>
                        <th class="px-4 py-3 font-bold">Name</th>
                        <th class="px-4 py-3 font-bold">Status</th>
                        <th class="px-4 py-3 font-bold">Start</th>
                        <th class="px-4 py-3 font-bold">Quantity</th>
                        <th class="px-4 py-3 font-bold">Predicted alc.</th>
                        <th class="px-4 py-3 font-bold">Location</th>
                        <th class="px-4 py-3 font-bold">Spoiled</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(batch, index)}
                        {@const batchParams = paramsByBatchId[batch.id] ?? []}
                        <TableRow
                            {index}
                            highlighted={Boolean(qrEquipmentId && batch.equipmentId === qrEquipmentId)}
                            expandLabel={`Expand details for ${batch.name}`}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3 font-mono text-xs font-semibold text-[#3f2e22]">
                                    {batch.batchNumber}
                                </td>
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">{batch.name}</td>
                                <td class="px-4 py-3">
                                    <div class="flex flex-wrap gap-1.5">
                                        <StatusBadge label={stage} tone="primary" />
                                        {#if batch.isSpoiled}
                                            <StatusBadge label="SPOILED" tone="danger" />
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-xs text-zinc-600">
                                    {batch.createdAt.slice(0, 10)}
                                </td>
                                <td class="px-4 py-3">
                                    {batch.quantity} {stage === "MUST" ? "kg" : "L"}
                                </td>
                                <td class="px-4 py-3">
                                    <button
                                        type="button"
                                        title="Open predicted alcohol calculator"
                                        class="cursor-pointer rounded-lg border border-[#d9cbbd] bg-[#fbf7f2] px-2.5 py-1 text-xs font-semibold text-[#3f2e22] hover:bg-[#e4d8cb]"
                                        onclick={() => (alcoholModalBatch = batch)}
                                    >
                                        {predictedAbvFor(batch)}%
                                    </button>
                                </td>
                                <td class="px-4 py-3 text-xs text-zinc-700">
                                    {batch.equipmentLabel}
                                </td>
                                <td class="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={batch.isSpoiled}
                                        aria-label={`Spoiled status for ${batch.name}`}
                                        class="h-4 w-4 cursor-pointer accent-[#8f3d32]"
                                        onclick={(e) => {
                                            e.preventDefault();
                                            spoilToggleTarget = {
                                                batch,
                                                nextSpoiled: !batch.isSpoiled,
                                            };
                                        }}
                                    />
                                </td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="flex flex-wrap items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        class="cursor-pointer rounded-lg bg-[#6b4f3a] px-3 py-2 text-xs font-medium text-white hover:bg-[#3f2e22]"
                                        onclick={() =>
                                            (paramModalTarget = { batch, record: null })}
                                    >
                                        + Parameters
                                    </button>
                                    <button
                                        type="button"
                                        class="cursor-pointer rounded-lg bg-[#8c735c] px-3 py-2 text-xs font-medium text-white hover:bg-[#6b4f3a]"
                                        onclick={() => (ingredientsModalBatch = batch)}
                                    >
                                        Ingredients
                                    </button>
                                    <button
                                        type="button"
                                        class="cursor-pointer rounded-lg border border-[#6b4f3a] bg-[#fbf7f2] px-3 py-2 text-xs font-semibold text-[#3f2e22] hover:bg-[#e4d8cb]"
                                        onclick={() => (potassiumModalBatch = batch)}
                                    >
                                        SO2 calc.
                                    </button>
                                    {#if stage === "BOTTLED"}
                                        <button
                                            type="button"
                                            class="cursor-pointer rounded-lg bg-[#3f2e22] px-3 py-2 text-xs font-medium text-white hover:bg-[#6b4f3a]"
                                            onclick={() => (nutrientsModalBatch = batch)}
                                        >
                                            Show nutrients
                                        </button>
                                    {/if}
                                    <button
                                        type="button"
                                        aria-label={`Edit ${batch.name}`}
                                        class="cursor-pointer rounded-lg bg-[#6b4f3a] px-3 py-2 text-xs font-medium text-white hover:bg-[#3f2e22]"
                                        onclick={() => openEdit(batch)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Delete ${batch.name}`}
                                        class="cursor-pointer rounded-lg bg-[#8f3d32] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                                        onclick={() => (deletingBatch = batch)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            {/snippet}
                            {#snippet details()}
                                <div class="flex flex-col gap-4">
                                    <div class="grid gap-4 text-xs sm:grid-cols-2">
                                        <div>
                                            <span class="block font-semibold uppercase text-zinc-500">
                                                Source batches / harvests
                                            </span>
                                            {#if batch.sources.length === 0}
                                                <span class="italic text-zinc-500">None recorded</span>
                                            {:else}
                                                <ul class="mt-1 flex flex-wrap gap-1.5">
                                                    {#each batch.sources as src (src.sourceId)}
                                                        <li class="rounded-md border border-[#d9cbbd] bg-white px-2.5 py-1 text-[#3f2e22]">
                                                            {src.label} ({src.quantity})
                                                        </li>
                                                    {/each}
                                                </ul>
                                            {/if}
                                        </div>

                                        <div>
                                            <span class="block font-semibold uppercase text-zinc-500">
                                                Added ingredients
                                            </span>
                                            {#if batch.ingredients.length === 0}
                                                <span class="italic text-zinc-500">No additives recorded</span>
                                            {:else}
                                                <ul class="mt-1 flex flex-wrap gap-1.5">
                                                    {#each batch.ingredients as ing (ing.id)}
                                                        <li class="rounded-md border border-[#d9cbbd] bg-white px-2.5 py-1 text-[#3f2e22]">
                                                            {ing.ingredientName}: <strong>{ing.quantityGrams} g</strong>
                                                        </li>
                                                    {/each}
                                                </ul>
                                            {/if}
                                        </div>
                                    </div>

                                    {#if batch.description}
                                        <div class="text-xs">
                                            <span class="block font-semibold uppercase text-zinc-500">
                                                Tasting & bottling notes
                                            </span>
                                            <p class="mt-1 text-[#3f2e22]">{batch.description}</p>
                                        </div>
                                    {/if}

                                    <div class="flex flex-col gap-2">
                                        <span class="text-xs font-semibold uppercase text-zinc-500">
                                            Chemical parameter history ({batchParams.length})
                                        </span>
                                        <ChemicalParametersTable
                                            records={batchParams}
                                            onEdit={(rec) =>
                                                (paramModalTarget = { batch, record: rec })}
                                            onDelete={(rec) => (deletingParam = rec)}
                                        />
                                    </div>
                                </div>
                            {/snippet}
                        </TableRow>
                    {/snippet}
                </ResultsTable>
            {/key}
        {/if}
    {/if}
</div>

{#if formOpen}
    <FormWindow
        title={editingBatch
            ? `Edit batch ${editingBatch.batchNumber}`
            : `Create new ${stageTitle.toLowerCase()} batch`}
        showBreadcrumbs={false}
        wide={true}
        acceptText="Confirm"
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={requestBatchSave}
    >
        <div class="flex flex-col gap-4">
            <div class="grid gap-3 sm:grid-cols-2">
                <InputField
                    label="Batch name"
                    placeholder={`e.g. ${stageTitle} Solaris 2026`}
                    bind:value={formName}
                    invalid={showValidation && !formName.trim()}
                />
                <InputField
                    label={`Quantity (${stage === "MUST" ? "kg" : "L"})`}
                    type="number"
                    min={0.1}
                    step={0.5}
                    bind:value={formQuantity}
                    invalid={showValidation && (!Number.isFinite(Number(formQuantity)) || Number(formQuantity) <= 0)}
                />
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="batch-location-select">
                        Location (winery equipment)
                    </label>
                    <DropdownInput
                        id="batch-location-select"
                        class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                        options={equipmentOptions}
                        placeholder="Select equipment"
                        bind:value={formEquipmentId}
                    />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="batch-yeast-select">
                        Yeast strain
                    </label>
                    <DropdownInput
                        id="batch-yeast-select"
                        class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                        options={YEAST_STRAINS.map((y) => ({ value: y.id, label: y.label }))}
                        placeholder="Select yeast"
                        bind:value={formYeastId}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-[#3f2e22]">
                        {stage === "MUST"
                            ? "Fruit / harvest batches"
                            : `Source batches (${ALLOWED_SOURCE_STAGES[stage].map((s) => STAGE_LABELS[s]).join(" / ")})`}
                    </span>
                    <div class="flex items-center gap-2">
                        {#if stage === "FERMENTING"}
                            <div class="w-40">
                                <Button
                                    text="Ingredients"
                                    isFolded={false}
                                    gentle={true}
                                    class="bg-[#8c735c] text-white"
                                    onClick={() => (formIngredientsOpen = true)}
                                />
                            </div>
                        {/if}
                        {#if availableSourceOptions.length > 0}
                            <div class="w-40">
                                <Button
                                    svg={plusIcon}
                                    text="Add source"
                                    isFolded={false}
                                    gentle={true}
                                    class="bg-[#6b4f3a] text-white fill-white"
                                    onClick={addSourceRow}
                                />
                            </div>
                        {/if}
                    </div>
                </div>

                {#if availableSourceOptions.length === 0}
                    <p class="text-xs text-zinc-600">
                        No healthy upstream batches/harvests recorded yet — you can still create this batch directly.
                    </p>
                {:else if formSources.length > 0}
                    <div class="flex flex-col gap-2">
                        {#each formSources as row, idx (row.id)}
                            <div class="grid items-end gap-2 sm:grid-cols-[1fr_9rem_7rem]">
                                <div class="flex flex-col gap-1">
                                    <label class="text-xs text-zinc-600" for={`src-row-${idx}`}>
                                        Source
                                    </label>
                                    <DropdownInput
                                        id={`src-row-${idx}`}
                                        class="w-full [&>button]:w-full [&>button]:h-11 [&>button]:rounded-full"
                                        options={availableSourceOptions.map((o) => ({
                                            value: o.value,
                                            label: o.label,
                                        }))}
                                        placeholder="Select source"
                                        bind:value={row.sourceId}
                                    />
                                </div>
                                <InputField
                                    label="Used qty"
                                    type="number"
                                    min={0.1}
                                    step={0.5}
                                    bind:value={row.quantityStr}
                                />
                                <Button
                                    svg={closeIcon}
                                    text="Remove"
                                    isFolded={false}
                                    gentle={true}
                                    class="bg-[#8f3d32] text-white fill-white"
                                    onClick={() => removeSourceRow(row.id)}
                                />
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if stage === "BOTTLED"}
                <TextareaField
                    label="Wine description (optional)"
                    placeholder="Tasting profile, vintage notes, barrel aging remarks..."
                    bind:value={formDescription}
                />
            {/if}

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if formIngredientsOpen}
    <BatchIngredientsModal
        batchName={formName.trim() || "New fermenting batch"}
        volumeLiters={Number(formQuantity) || 100}
        {catalogue}
        initialItems={formIngredients}
        onClose={() => (formIngredientsOpen = false)}
        onSave={(items) => {
            formIngredients = items;
            formIngredientsOpen = false;
        }}
    />
{/if}

{#if confirmBatchSaveOpen}
    <ConfirmationDialog
        title={editingBatch ? "Confirm batch update" : "Confirm new batch"}
        text={editingBatch
            ? `Are you sure you want to save changes to batch ${editingBatch.batchNumber} ("${formName.trim()}")?`
            : `Are you sure you want to create a new ${stageTitle.toLowerCase()} batch "${formName.trim()}"?`}
        acceptText="Confirm"
        onClose={() => (confirmBatchSaveOpen = false)}
        onCancel={() => (confirmBatchSaveOpen = false)}
        onAccept={() => void executeBatchSave()}
    />
{/if}

{#if deletingBatch}
    <ConfirmationDialog
        title="Delete batch"
        text={`Delete ${STAGE_LABELS[deletingBatch.stage].toLowerCase()} batch ${deletingBatch.batchNumber} ("${deletingBatch.name}")?`}
        acceptText="Delete"
        onClose={() => (deletingBatch = null)}
        onCancel={() => (deletingBatch = null)}
        onAccept={() => void confirmDeleteBatch()}
    />
{/if}

{#if spoilToggleTarget}
    <ConfirmationDialog
        title={spoilToggleTarget.nextSpoiled ? "Mark as spoiled" : "Mark as not spoiled"}
        text={spoilToggleTarget.nextSpoiled
            ? `Mark batch ${spoilToggleTarget.batch.batchNumber} ("${spoilToggleTarget.batch.name}") as spoiled? Spoiled batches are blocked from entering subsequent production stages.`
            : `Unmark batch ${spoilToggleTarget.batch.batchNumber} ("${spoilToggleTarget.batch.name}") as spoiled so it can proceed in production?`}
        acceptText="Confirm"
        onClose={() => (spoilToggleTarget = null)}
        onCancel={() => (spoilToggleTarget = null)}
        onAccept={() => void confirmSpoilToggle()}
    />
{/if}

{#if paramModalTarget}
    <ChemicalParameterModal
        batchLabel={`${paramModalTarget.batch.batchNumber} · ${paramModalTarget.batch.name}`}
        editingRecord={paramModalTarget.record}
        onClose={() => (paramModalTarget = null)}
        onSave={handleSaveParameter}
    />
{/if}

{#if deletingParam}
    <ConfirmationDialog
        title="Delete parameter reading"
        text="Remove this chemical parameter measurement from the batch?"
        acceptText="Delete"
        onClose={() => (deletingParam = null)}
        onCancel={() => (deletingParam = null)}
        onAccept={() => void confirmDeleteParam()}
    />
{/if}

{#if ingredientsModalBatch}
    <BatchIngredientsModal
        batchName={`${ingredientsModalBatch.batchNumber} · ${ingredientsModalBatch.name}`}
        volumeLiters={ingredientsModalBatch.quantity}
        latestPh={latestParamFor(ingredientsModalBatch.id)?.pH ?? null}
        {catalogue}
        initialItems={ingredientsModalBatch.ingredients}
        onClose={() => (ingredientsModalBatch = null)}
        onSave={handleSaveBatchIngredients}
    />
{/if}

{#if potassiumModalBatch}
    <PotassiumCalculatorModal
        volumeLiters={potassiumModalBatch.quantity}
        initialPh={latestParamFor(potassiumModalBatch.id)?.pH ?? null}
        onClose={() => (potassiumModalBatch = null)}
        onApplyDose={handleQuickPotassiumDose}
    />
{/if}

{#if alcoholModalBatch}
    <PredictedAlcoholModal
        volumeLiters={alcoholModalBatch.quantity}
        initialSugarGL={latestParamFor(alcoholModalBatch.id)?.sugarLevel ?? 200}
        initialAddedSugarGrams={addedSugarGramsFor(alcoholModalBatch)}
        initialYeastId={alcoholModalBatch.yeastId}
        onClose={() => (alcoholModalBatch = null)}
    />
{/if}

{#if nutrientsModalBatch}
    {@const autoNutrients = autoNutrientsFor(nutrientsModalBatch)}
    <NutrientsTableModal
        batchName={`${nutrientsModalBatch.batchNumber} · ${nutrientsModalBatch.name}`}
        initialNutrients={nutrientsModalBatch.nutrientsOverride ?? autoNutrients}
        autoCalculatedNutrients={autoNutrients}
        editable={true}
        onClose={() => (nutrientsModalBatch = null)}
        onSave={handleSaveNutrients}
    />
{/if}

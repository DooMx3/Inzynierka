<script lang="ts">
    import plusIcon from "$lib/assets/plus.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import PotassiumCalculatorModal from "$lib/components/calculators/potassiumCalculatorModal.svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import type { BatchIngredientItem } from "$lib/api/batches";
    import type { Ingredient } from "$lib/api/ingredients";

    let {
        batchName,
        volumeLiters,
        latestPh = null,
        catalogue,
        initialItems,
        onSave,
        onClose = () => {},
    }: {
        batchName: string;
        volumeLiters: number;
        latestPh?: number | null;
        catalogue: Ingredient[];
        initialItems: BatchIngredientItem[];
        onSave: (items: BatchIngredientItem[]) => void | Promise<void>;
        onClose?: () => void;
    } = $props();

    type EditableRow = {
        id: string;
        ingredientId: string;
        quantityStr: string | number | null;
    };

    const buildRows = (source: BatchIngredientItem[]): EditableRow[] =>
        source.length > 0
            ? source.map((item) => ({
                  id: item.id,
                  ingredientId: item.ingredientId,
                  quantityStr: String(item.quantityGrams),
              }))
            : [];

    let rows = $derived<EditableRow[]>(buildRows(initialItems));
    let deletingRowId = $state<string | null>(null);
    let calcOpen = $state(false);
    let errorMsg = $state("");

    const addRow = () => {
        const defaultIng = catalogue[0]?.id ?? "";
        rows = [
            ...rows,
            {
                id: `bi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                ingredientId: defaultIng,
                quantityStr: "10",
            },
        ];
    };

    const removeRow = (id: string) => {
        rows = rows.filter((row) => row.id !== id);
        deletingRowId = null;
    };

    const applyPotassiumDose = (grams: number) => {
        const potassiumIng =
            catalogue.find((c) => {
                const lower = c.name.toLowerCase();
                return (
                    lower.includes("metabisulfite") ||
                    lower.includes("pirosiarczyn") ||
                    lower.includes("k2s2o5")
                );
            }) ?? catalogue[0];
        if (!potassiumIng) {
            return;
        }
        const existingIndex = rows.findIndex((r) => r.ingredientId === potassiumIng.id);
        if (existingIndex >= 0) {
            rows = rows.map((row, idx) =>
                idx === existingIndex ? { ...row, quantityStr: String(grams) } : row,
            );
        } else {
            rows = [
                ...rows,
                {
                    id: `bi-k2s2o5-${Date.now()}`,
                    ingredientId: potassiumIng.id,
                    quantityStr: String(grams),
                },
            ];
        }
    };

    const submit = async () => {
        const mapped: BatchIngredientItem[] = [];
        for (const row of rows) {
            const qty = Number(row.quantityStr);
            if (!row.ingredientId || !Number.isFinite(qty) || qty <= 0) {
                errorMsg = "Every ingredient row must select an ingredient and a positive quantity.";
                return;
            }
            const ing = catalogue.find((c) => c.id === row.ingredientId);
            mapped.push({
                id: row.id,
                ingredientId: row.ingredientId,
                ingredientName: ing?.name ?? row.ingredientId,
                quantityGrams: qty,
            });
        }
        errorMsg = "";
        await onSave(mapped);
    };
</script>

<FormWindow
    title={`Batch ingredients · ${batchName}`}
    showBreadcrumbs={false}
    wide={true}
    acceptText="Confirm"
    onClose={onClose}
    onCancel={onClose}
    onAccept={() => void submit()}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="w-48">
                <Button
                    svg={plusIcon}
                    text="Add ingredient"
                    isFolded={false}
                    gentle={true}
                    class="bg-[#6b4f3a] text-white fill-white"
                    onClick={addRow}
                />
            </div>
            <div class="w-56">
                <Button
                    text="Potassium calc."
                    isFolded={false}
                    gentle={true}
                    class="bg-[#8c735c] text-white"
                    onClick={() => (calcOpen = true)}
                />
            </div>
        </div>

        {#if rows.length === 0}
            <p class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-4 text-sm text-zinc-600">
                No ingredients attached to this batch yet. Click "Add ingredient" or use "Potassium calc." to compute and add potassium metabisulfite.
            </p>
        {:else}
            <div class="flex flex-col gap-3">
                {#each rows as row, idx (row.id)}
                    <div
                        class="grid items-end gap-3 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-3 sm:grid-cols-[1fr_10rem_8rem]"
                    >
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-zinc-600" for={`ing-select-${idx}`}>
                                Ingredient
                            </label>
                            <DropdownInput
                                id={`ing-select-${idx}`}
                                class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                                options={catalogue.map((c) => ({
                                    value: c.id,
                                    label: `${c.name} (${c.number})`,
                                }))}
                                placeholder="Select ingredient"
                                bind:value={row.ingredientId}
                            />
                        </div>

                        <InputField
                            label="Quantity (g)"
                            type="number"
                            min={0.01}
                            step={0.1}
                            bind:value={row.quantityStr}
                        />

                        <Button
                            svg={closeIcon}
                            text="Remove"
                            isFolded={false}
                            gentle={true}
                            class="bg-[#8f3d32] text-white fill-white"
                            onClick={() => (deletingRowId = row.id)}
                        />
                    </div>
                {/each}
            </div>
        {/if}

        {#if errorMsg}
            <p class="text-sm text-[#8f3d32]" role="alert">{errorMsg}</p>
        {/if}
    </div>
</FormWindow>

{#if calcOpen}
    <PotassiumCalculatorModal
        {volumeLiters}
        initialPh={latestPh}
        onClose={() => (calcOpen = false)}
        onApplyDose={applyPotassiumDose}
    />
{/if}

{#if deletingRowId}
    <ConfirmationDialog
        title="Delete ingredient from batch"
        text="Remove this ingredient entry from the production batch?"
        acceptText="Remove"
        onClose={() => (deletingRowId = null)}
        onCancel={() => (deletingRowId = null)}
        onAccept={() => removeRow(deletingRowId!)}
    />
{/if}

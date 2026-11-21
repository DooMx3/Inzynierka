<script lang="ts">
    import { onMount } from "svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import {
        createIngredient,
        deleteIngredient,
        getIngredients,
        updateIngredient,
        type Ingredient,
    } from "$lib/api/ingredients";
    import { session } from "$lib/stores/session.svelte";

    let items = $state<Ingredient[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("number");
    let filter = $state("all");

    let formOpen = $state(false);
    let confirmSaveOpen = $state(false);
    let editingItem = $state<Ingredient | null>(null);

    let formName = $state("");
    let formEnergy = $state<string | number | null>("0");
    let formFat = $state<string | number | null>("0");
    let formSatFat = $state<string | number | null>("0");
    let formCarbs = $state<string | number | null>("0");
    let formSugars = $state<string | number | null>("0");
    let formProtein = $state<string | number | null>("0");
    let formSalt = $state<string | number | null>("0");
    let formFibers = $state<string | number | null>("0");
    let formError = $state("");
    let showValidation = $state(false);

    let deletingItem = $state<Ingredient | null>(null);

    const canAccess = $derived(
        Boolean(session.user?.roles.some((role) => role === "OENOLOGIST" || role === "OWNER")),
    );

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            items = await getIngredients();
        } catch (error) {
            loadError = error instanceof Error ? error.message : "Could not load ingredients.";
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

    const visibleItems = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = items.filter((item) => {
            if (filter === "caloric" && item.energyContent <= 0) {
                return false;
            }
            if (filter === "zero" && item.energyContent > 0) {
                return false;
            }
            if (!needle) {
                return true;
            }
            return `${item.number} ${item.name}`.toLowerCase().includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "name") {
                return left.name.localeCompare(right.name);
            }
            if (sort === "energy") {
                return right.energyContent - left.energyContent;
            }
            return left.number.localeCompare(right.number);
        });

        return matched;
    });

    const openCreate = () => {
        editingItem = null;
        formName = "";
        formEnergy = "0";
        formFat = "0";
        formSatFat = "0";
        formCarbs = "0";
        formSugars = "0";
        formProtein = "0";
        formSalt = "0";
        formFibers = "0";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (item: Ingredient) => {
        editingItem = item;
        formName = item.name;
        formEnergy = String(item.energyContent);
        formFat = String(item.fat);
        formSatFat = String(item.saturatedFattyAcids);
        formCarbs = String(item.carbs);
        formSugars = String(item.sugars);
        formProtein = String(item.protein);
        formSalt = String(item.salt);
        formFibers = String(item.fibers);
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const requestSaveConfirmation = () => {
        showValidation = true;
        if (!formName.trim()) {
            formError = "Ingredient name is required.";
            return;
        }
        formError = "";
        confirmSaveOpen = true;
    };

    const executeSave = async () => {
        try {
            const payload = {
                name: formName.trim(),
                energyContent: Math.max(0, Number(formEnergy) || 0),
                fat: Math.max(0, Number(formFat) || 0),
                saturatedFattyAcids: Math.max(0, Number(formSatFat) || 0),
                carbs: Math.max(0, Number(formCarbs) || 0),
                sugars: Math.max(0, Number(formSugars) || 0),
                protein: Math.max(0, Number(formProtein) || 0),
                salt: Math.max(0, Number(formSalt) || 0),
                fibers: Math.max(0, Number(formFibers) || 0),
            };
            if (editingItem) {
                await updateIngredient(editingItem.id, payload);
            } else {
                await createIngredient(payload);
            }
            confirmSaveOpen = false;
            formOpen = false;
            editingItem = null;
            await load();
        } catch (error) {
            confirmSaveOpen = false;
            formError = error instanceof Error ? error.message : "Could not save ingredient.";
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem) {
            return;
        }
        await deleteIngredient(deletingItem.id);
        deletingItem = null;
        await load();
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only oenologists and the organisation owner can manage production ingredients.
        </p>
    {:else}
        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text="New ingredient" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What ingredient are you looking for?"
            searchPlaceholder="Search by ingredient number or name..."
            sortOptions={[
                { value: "number", label: "Number" },
                { value: "name", label: "Name" },
                { value: "energy", label: "Energy (kcal)" },
            ]}
            filterOptions={[
                { value: "all", label: "All ingredients" },
                { value: "caloric", label: "Caloric (> 0 kcal)" },
                { value: "zero", label: "Non-caloric (0 kcal)" },
            ]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading ingredients...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleItems} emptyLabel="No ingredients match this search.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Number</th>
                        <th class="px-4 py-3 font-bold">Name</th>
                        <th class="px-4 py-3 font-bold">Energy / 100 g</th>
                        <th class="px-4 py-3 font-bold">Sugars / 100 g</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(item, index)}
                        <TableRow
                            {index}
                            expandLabel={`Expand nutrients for ${item.name}`}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3">
                                    <StatusBadge label={item.number} tone="neutral" />
                                </td>
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">{item.name}</td>
                                <td class="px-4 py-3">{item.energyContent} kcal</td>
                                <td class="px-4 py-3">{item.sugars} g</td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="w-28">
                                    <Button
                                        svg={editIcon}
                                        text="Edit"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#6b4f3a] text-white fill-white"
                                        onClick={() => openEdit(item)}
                                    />
                                </div>
                                <div class="w-32">
                                    <Button
                                        svg={closeIcon}
                                        text="Delete"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#8f3d32] text-white fill-white"
                                        onClick={() => (deletingItem = item)}
                                    />
                                </div>
                            {/snippet}
                            {#snippet details()}
                                <div class="grid grid-cols-2 gap-3 text-xs text-zinc-700 sm:grid-cols-4">
                                    <div>
                                        <span class="font-semibold text-zinc-500">Fat:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.fat} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Saturated fat:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.saturatedFattyAcids} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Carbs:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.carbs} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Sugars:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.sugars} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Protein:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.protein} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Salt:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.salt} g</span>
                                    </div>
                                    <div>
                                        <span class="font-semibold text-zinc-500">Fibre:</span>
                                        <span class="ml-1 text-[#3f2e22]">{item.fibers} g</span>
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
        title={editingItem ? `Edit ${editingItem.number}` : "Add new ingredient"}
        showBreadcrumbs={false}
        wide={true}
        acceptText="Confirm"
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={requestSaveConfirmation}
    >
        <div class="flex flex-col gap-4">
            <InputField
                label="Ingredient name"
                placeholder="e.g. Acacia gum"
                bind:value={formName}
                invalid={showValidation && !formName.trim()}
            />

            <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nutritional values per 100 g
            </p>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <InputField label="Energy (kcal)" type="number" min={0} step={0.1} bind:value={formEnergy} />
                <InputField label="Fat (g)" type="number" min={0} step={0.1} bind:value={formFat} />
                <InputField label="Saturated fat (g)" type="number" min={0} step={0.1} bind:value={formSatFat} />
                <InputField label="Carbs (g)" type="number" min={0} step={0.1} bind:value={formCarbs} />
                <InputField label="Sugars (g)" type="number" min={0} step={0.1} bind:value={formSugars} />
                <InputField label="Protein (g)" type="number" min={0} step={0.1} bind:value={formProtein} />
                <InputField label="Salt (g)" type="number" min={0} step={0.01} bind:value={formSalt} />
                <InputField label="Fibre (g)" type="number" min={0} step={0.1} bind:value={formFibers} />
            </div>

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if confirmSaveOpen}
    <ConfirmationDialog
        title={editingItem ? "Confirm ingredient update" : "Confirm new ingredient"}
        text={editingItem
            ? `Save changes to "${formName.trim()}" (${editingItem.number})?`
            : `Add "${formName.trim()}" to the organisation's ingredients catalogue?`}
        acceptText="Confirm"
        onClose={() => (confirmSaveOpen = false)}
        onCancel={() => (confirmSaveOpen = false)}
        onAccept={() => void executeSave()}
    />
{/if}

{#if deletingItem}
    <ConfirmationDialog
        title="Delete ingredient"
        text={`Delete ingredient "${deletingItem.name}" (${deletingItem.number})?`}
        acceptText="Delete"
        onClose={() => (deletingItem = null)}
        onCancel={() => (deletingItem = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

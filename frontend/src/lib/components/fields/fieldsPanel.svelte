<script lang="ts">
    import { onMount } from "svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import { ApiError } from "$lib/api/auth";
    import {
        createField,
        DEFAULT_GRAPE_COLORS,
        DEFAULT_GRAPE_VARIETIES,
        deleteField,
        getFields,
        getGrapeColors,
        getGrapeTypes,
        updateField,
        type GrapeColor,
        type GrapeVariety,
        type GrapeVarietyOption,
        type VineyardField,
    } from "$lib/api/fields";
    import { session } from "$lib/stores/session.svelte";

    let fields = $state<VineyardField[]>([]);
    let varietyOptions = $state<GrapeVarietyOption[]>(DEFAULT_GRAPE_VARIETIES);
    let colorOptions = $state<GrapeColor[]>(DEFAULT_GRAPE_COLORS);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("variety");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingField = $state<VineyardField | null>(null);
    let formArea = $state("");
    let formVariety = $state<string>("SOLARIS");
    let formOtherVariety = $state("");
    let formColor = $state<string>("WHITE");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingField = $state<VineyardField | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [loadedFields, loadedTypes, loadedColors] = await Promise.all([
                getFields(),
                getGrapeTypes(),
                getGrapeColors(),
            ]);
            fields = loadedFields;
            varietyOptions = loadedTypes;
            colorOptions = loadedColors;
        } catch (error) {
            fields = [];
            loadError =
                error instanceof ApiError && error.status === 403
                    ? "Only the organisation owner can manage fields."
                    : error instanceof Error
                      ? error.message
                      : "Could not load fields.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!session.user?.roles.includes("OWNER")) {
            loading = false;
            return;
        }
        void load();
    });

    const requiresCustomVariety = $derived(
        varietyOptions.find((opt) => opt.value === formVariety)?.requiresCustomName ??
            formVariety === "OTHER",
    );

    const visibleFields = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = fields.filter((field) => {
            if (filter === "RED" || filter === "WHITE") {
                if (field.grapeColor !== filter) {
                    return false;
                }
            }
            if (!needle) {
                return true;
            }
            const haystack = [field.grapeVarietyName, field.grapeColor, String(field.areaAre)]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "area") {
                return right.areaAre - left.areaAre;
            }
            if (sort === "color") {
                return left.grapeColor.localeCompare(right.grapeColor);
            }
            return left.grapeVarietyName.localeCompare(right.grapeVarietyName);
        });

        return matched;
    });

    const openCreate = () => {
        editingField = null;
        formArea = "";
        formVariety = varietyOptions[0]?.value ?? "SOLARIS";
        formOtherVariety = "";
        formColor = colorOptions[0] ?? "WHITE";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (field: VineyardField) => {
        editingField = field;
        formArea = String(field.areaAre);
        formVariety = field.grapeVariety;
        formOtherVariety = field.grapeVariety === "OTHER" ? field.grapeVarietyName : "";
        formColor = field.grapeColor;
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        const parsedArea = Number(formArea);
        if (!Number.isFinite(parsedArea) || parsedArea < 0.01) {
            formError = "Area must be at least 0.01 ar.";
            return;
        }
        if (requiresCustomVariety && !formOtherVariety.trim()) {
            formError = "Enter a custom grape variety name.";
            return;
        }

        formPending = true;
        formError = "";
        try {
            const payload = {
                areaAre: parsedArea,
                grapeVariety: formVariety as GrapeVariety,
                otherGrapeVariety: requiresCustomVariety ? formOtherVariety.trim() : undefined,
                grapeColor: (formColor === "WHITE" ? "WHITE" : "RED") as GrapeColor,
            };
            if (editingField) {
                await updateField(editingField.id, payload);
            } else {
                await createField(payload);
            }
            formOpen = false;
            editingField = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save field.";
        } finally {
            formPending = false;
        }
    };

    const confirmDelete = async () => {
        if (!deletingField || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteField(deletingField.id);
            deletingField = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete field.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">Only the organisation owner can manage fields.</p>
    {:else}
        <div class="flex justify-end">
            <div class="w-52">
                <AddButton text="New field" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What field are you looking for?"
            searchPlaceholder="Search by grape variety, color, or area..."
            sortOptions={[
                { value: "variety", label: "Grape variety" },
                { value: "area", label: "Area (ar)" },
                { value: "color", label: "Grape color" },
            ]}
            filterOptions={[
                { value: "all", label: "All colors" },
                { value: "RED", label: "Red grapes" },
                { value: "WHITE", label: "White grapes" },
            ]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading fields...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleFields} emptyLabel="No vineyard fields found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Grape variety</th>
                        <th class="px-4 py-3 font-bold">Color</th>
                        <th class="px-4 py-3 font-bold">Area (ar)</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(field, index)}
                        <TableRow {index}>
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">
                                    {field.grapeVarietyName}
                                </td>
                                <td class="px-4 py-3">
                                    <StatusBadge
                                        label={field.grapeColor === "RED" ? "Red" : "White"}
                                        tone={field.grapeColor === "RED" ? "dark" : "neutral"}
                                    />
                                </td>
                                <td class="px-4 py-3">{field.areaAre} ar</td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="w-28">
                                    <Button
                                        svg={editIcon}
                                        text="Edit"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#6b4f3a] text-white fill-white"
                                        onClick={() => openEdit(field)}
                                    />
                                </div>
                                <div class="w-32">
                                    <Button
                                        svg={closeIcon}
                                        text="Delete"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#8f3d32] text-white fill-white"
                                        onClick={() => {
                                            deleteError = "";
                                            deletingField = field;
                                        }}
                                    />
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
        title={editingField ? "Edit field" : "Add new field"}
        showBreadcrumbs={false}
        acceptText={editingField ? "Save" : "Create"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="field-variety-select">Grape variety</label>
                <DropdownInput
                    id="field-variety-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={varietyOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                    placeholder="Select grape variety"
                    bind:value={formVariety}
                />
            </div>

            {#if requiresCustomVariety}
                <InputField
                    label="Custom grape variety"
                    placeholder="e.g. Bianca"
                    bind:value={formOtherVariety}
                    invalid={showValidation && !formOtherVariety.trim()}
                />
            {/if}

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="field-color-select">Grape color</label>
                <DropdownInput
                    id="field-color-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={colorOptions.map((color) => ({
                        value: color,
                        label: color === "RED" ? "Red" : "White",
                    }))}
                    placeholder="Select color"
                    bind:value={formColor}
                />
            </div>

            <InputField
                label="Area (ar)"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="e.g. 25"
                bind:value={formArea}
                invalid={showValidation && (!Number.isFinite(Number(formArea)) || Number(formArea) < 0.01)}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingField}
    <ConfirmationDialog
        title="Delete field"
        text={deleteError || `Deactivate field "${deletingField.grapeVarietyName}" (${deletingField.areaAre} ar)? It will stay linked to historical harvests and sprayings.`}
        acceptText="Delete"
        onClose={() => (deletingField = null)}
        onCancel={() => (deletingField = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

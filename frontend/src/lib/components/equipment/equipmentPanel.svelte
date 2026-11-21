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
        createEquipment,
        deleteEquipment,
        EQUIPMENT_TYPE_PRESETS,
        getEquipmentList,
        updateEquipment,
        type Equipment,
    } from "$lib/api/equipment";
    import { session } from "$lib/stores/session.svelte";

    let items = $state<Equipment[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("name");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingItem = $state<Equipment | null>(null);
    let formName = $state("");
    let formTypePreset = $state("Fermentor");
    let formCustomType = $state("");
    let formInspectionDate = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingItem = $state<Equipment | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            items = await getEquipmentList();
        } catch (error) {
            items = [];
            loadError =
                error instanceof ApiError && error.status === 403
                    ? "Only the organisation owner can manage equipment."
                    : error instanceof Error
                      ? error.message
                      : "Could not load equipment.";
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

    const typeFilterOptions = $derived.by(() => {
        const distinctTypes = Array.from(new Set(items.map((item) => item.type).filter(Boolean))).sort();
        return [
            { value: "all", label: "All types" },
            ...distinctTypes.map((t) => ({ value: t, label: t })),
        ];
    });

    const visibleItems = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = items.filter((item) => {
            if (filter !== "all" && item.type !== filter) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [item.name, item.type, item.endOfTechnicalInspection ?? ""]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "type") {
                return left.type.localeCompare(right.type);
            }
            if (sort === "inspection") {
                return (left.endOfTechnicalInspection ?? "9999-99-99").localeCompare(
                    right.endOfTechnicalInspection ?? "9999-99-99",
                );
            }
            return left.name.localeCompare(right.name);
        });

        return matched;
    });

    const effectiveType = $derived(
        formTypePreset === "Other" ? formCustomType.trim() : formTypePreset.trim(),
    );

    const openCreate = () => {
        editingItem = null;
        formName = "";
        formTypePreset = "Fermentor";
        formCustomType = "";
        formInspectionDate = "";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (item: Equipment) => {
        editingItem = item;
        formName = item.name;
        if (EQUIPMENT_TYPE_PRESETS.includes(item.type as (typeof EQUIPMENT_TYPE_PRESETS)[number]) && item.type !== "Other") {
            formTypePreset = item.type;
            formCustomType = "";
        } else {
            formTypePreset = "Other";
            formCustomType = item.type;
        }
        formInspectionDate = item.endOfTechnicalInspection ?? "";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        if (!formName.trim() || !effectiveType) {
            formError = "Equipment name and type are required.";
            return;
        }
        formPending = true;
        formError = "";
        try {
            const payload = {
                name: formName.trim(),
                type: effectiveType,
                endOfTechnicalInspection: formInspectionDate || undefined,
            };
            if (editingItem) {
                await updateEquipment(editingItem.id, payload);
            } else {
                await createEquipment(payload);
            }
            formOpen = false;
            editingItem = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save equipment.";
        } finally {
            formPending = false;
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteEquipment(deletingItem.id);
            deletingItem = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete equipment.";
        } finally {
            deletePending = false;
        }
    };

    const isInspectionExpired = (dateStr: string | null) => {
        if (!dateStr) {
            return false;
        }
        const today = new Date().toISOString().slice(0, 10);
        return dateStr < today;
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">Only the organisation owner can manage equipment.</p>
    {:else}
        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text="New equipment" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What equipment are you looking for?"
            searchPlaceholder="Search by name, type, or inspection date..."
            sortOptions={[
                { value: "name", label: "Name" },
                { value: "type", label: "Type" },
                { value: "inspection", label: "Inspection date" },
            ]}
            filterOptions={typeFilterOptions}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading equipment...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleItems} emptyLabel="No equipment records found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Name</th>
                        <th class="px-4 py-3 font-bold">Type</th>
                        <th class="px-4 py-3 font-bold">End of technical inspection</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(item, index)}
                        <TableRow {index}>
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">{item.name}</td>
                                <td class="px-4 py-3">
                                    <StatusBadge label={item.type} tone="secondary" />
                                </td>
                                <td class="px-4 py-3">
                                    {#if item.endOfTechnicalInspection}
                                        <span class="inline-flex items-center gap-2">
                                            <span>{item.endOfTechnicalInspection}</span>
                                            {#if isInspectionExpired(item.endOfTechnicalInspection)}
                                                <StatusBadge label="Expired" tone="danger" />
                                            {/if}
                                        </span>
                                    {:else}
                                        <span class="text-zinc-400">Not set</span>
                                    {/if}
                                </td>
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
                                        onClick={() => {
                                            deleteError = "";
                                            deletingItem = item;
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
        title={editingItem ? "Edit equipment" : "Add new equipment"}
        showBreadcrumbs={false}
        acceptText={editingItem ? "Save" : "Create"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <InputField
                label="Equipment name"
                placeholder="e.g. Fermentor #1"
                bind:value={formName}
                invalid={showValidation && !formName.trim()}
            />

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="equipment-type-select">Type</label>
                <DropdownInput
                    id="equipment-type-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={[...EQUIPMENT_TYPE_PRESETS]}
                    placeholder="Select type"
                    bind:value={formTypePreset}
                />
            </div>

            {#if formTypePreset === "Other"}
                <InputField
                    label="Custom equipment type"
                    placeholder="Enter custom equipment type"
                    bind:value={formCustomType}
                    invalid={showValidation && !formCustomType.trim()}
                />
            {/if}

            <InputField
                label="End of technical inspection (optional)"
                type="date"
                bind:value={formInspectionDate}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingItem}
    <ConfirmationDialog
        title="Delete equipment"
        text={deleteError || `Deactivate "${deletingItem.name}"? Historical records linked to this equipment will remain intact.`}
        acceptText="Delete"
        onClose={() => (deletingItem = null)}
        onCancel={() => (deletingItem = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

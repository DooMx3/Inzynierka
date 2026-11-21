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
    import TextareaField from "$lib/components/textareaField/textareaField.svelte";
    import { formatFieldLabel, getFields, type VineyardField } from "$lib/api/fields";
    import {
        createPestObservation,
        deletePestObservation,
        getPestObservations,
        updatePestObservation,
        type PestObservation,
        type PestObservationType,
    } from "$lib/api/pests";
    import { session } from "$lib/stores/session.svelte";

    let observations = $state<PestObservation[]>([]);
    let fields = $state<VineyardField[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("date");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingItem = $state<PestObservation | null>(null);
    let formName = $state("");
    let formType = $state<string>("DISEASE");
    let formFieldId = $state("");
    let formObservedAt = $state("");
    let formDescription = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingItem = $state<PestObservation | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const canAccess = $derived(
        Boolean(session.user?.roles.some((role) => role === "WORKER" || role === "OWNER")),
    );

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [loadedObservations, loadedFields] = await Promise.all([
                getPestObservations(),
                getFields(),
            ]);
            observations = loadedObservations;
            fields = loadedFields;
        } catch (error) {
            observations = [];
            loadError =
                error instanceof Error ? error.message : "Could not load pest and disease records.";
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

    const fieldById = $derived(new Map(fields.map((f) => [f.id, f])));
    const fieldLabel = (id: string) => {
        const found = fieldById.get(id);
        return found ? formatFieldLabel(found) : `Field ${id.slice(0, 8)}`;
    };

    const visibleObservations = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = observations.filter((item) => {
            if (filter === "PEST" || filter === "DISEASE") {
                if (item.type !== filter) {
                    return false;
                }
            } else if (filter !== "all" && item.fieldId !== filter) {
                return false;
            }

            if (!needle) {
                return true;
            }
            const haystack = [
                item.name,
                item.type,
                item.observedAt,
                item.description,
                fieldLabel(item.fieldId),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "name") {
                return left.name.localeCompare(right.name);
            }
            if (sort === "field") {
                return fieldLabel(left.fieldId).localeCompare(fieldLabel(right.fieldId));
            }
            return right.observedAt.localeCompare(left.observedAt);
        });

        return matched;
    });

    const openCreate = () => {
        editingItem = null;
        formName = "";
        formType = "DISEASE";
        formFieldId = fields[0]?.id ?? "";
        formObservedAt = new Date().toISOString().slice(0, 10);
        formDescription = "";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (item: PestObservation) => {
        editingItem = item;
        formName = item.name;
        formType = item.type;
        formFieldId = item.fieldId;
        formObservedAt = item.observedAt;
        formDescription = item.description;
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        if (!formName.trim() || !formFieldId || !formObservedAt) {
            formError = "Name, field, and observation date are required.";
            return;
        }
        formPending = true;
        formError = "";
        try {
            const payload = {
                name: formName.trim(),
                type: (formType === "PEST" ? "PEST" : "DISEASE") as PestObservationType,
                fieldId: formFieldId,
                observedAt: formObservedAt,
                description: formDescription.trim() || undefined,
            };
            if (editingItem) {
                await updatePestObservation(editingItem.id, payload);
            } else {
                await createPestObservation(payload);
            }
            formOpen = false;
            editingItem = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save observation.";
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
            await deletePestObservation(deletingItem.id);
            deletingItem = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete observation.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only vineyard workers and the organisation owner can manage pest and disease records.
        </p>
    {:else}
        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text="New observation" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What pest or disease are you looking for?"
            searchPlaceholder="Search by name, notes, field, or date..."
            sortOptions={[
                { value: "date", label: "Date observed" },
                { value: "name", label: "Name" },
                { value: "field", label: "Field" },
            ]}
            filterOptions={[
                { value: "all", label: "All records" },
                { value: "DISEASE", label: "Plant diseases" },
                { value: "PEST", label: "Pests" },
                ...fields.map((field) => ({ value: field.id, label: formatFieldLabel(field) })),
            ]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading observations...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleObservations} emptyLabel="No pest or disease observations found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Name</th>
                        <th class="px-4 py-3 font-bold">Type</th>
                        <th class="px-4 py-3 font-bold">Field</th>
                        <th class="px-4 py-3 font-bold">Observed date</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(item, index)}
                        <TableRow
                            {index}
                            expandLabel={`Expand notes for ${item.name}`}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">{item.name}</td>
                                <td class="px-4 py-3">
                                    <StatusBadge
                                        label={item.type === "PEST" ? "Pest" : "Disease"}
                                        tone={item.type === "PEST" ? "danger" : "secondary"}
                                    />
                                </td>
                                <td class="px-4 py-3">{fieldLabel(item.fieldId)}</td>
                                <td class="px-4 py-3">{item.observedAt}</td>
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
                            {#snippet details()}
                                <div class="flex flex-col gap-1 text-sm text-zinc-700">
                                    <span class="text-xs font-semibold uppercase text-zinc-500">
                                        Observation notes
                                    </span>
                                    <p class="whitespace-pre-wrap text-[#3f2e22]">
                                        {item.description || "No additional notes provided."}
                                    </p>
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
        title={editingItem ? "Edit observation" : "Add pest or disease"}
        showBreadcrumbs={false}
        acceptText={editingItem ? "Save" : "Apply"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <InputField
                label="Pest or disease name"
                placeholder="e.g. Black rot"
                bind:value={formName}
                invalid={showValidation && !formName.trim()}
            />

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="pest-type-select">Category</label>
                <DropdownInput
                    id="pest-type-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={[
                        { value: "DISEASE", label: "Plant disease" },
                        { value: "PEST", label: "Pest" },
                    ]}
                    placeholder="Select category"
                    bind:value={formType}
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="pest-field-select">Field</label>
                <DropdownInput
                    id="pest-field-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={fields.map((f) => ({ value: f.id, label: formatFieldLabel(f) }))}
                    placeholder="Select field"
                    bind:value={formFieldId}
                />
            </div>

            <InputField
                label="Date observed"
                type="date"
                bind:value={formObservedAt}
                invalid={showValidation && !formObservedAt}
            />

            <TextareaField
                label="Description (optional)"
                placeholder="Describe symptoms, affected area, or severity..."
                maxlength={2000}
                bind:value={formDescription}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingItem}
    <ConfirmationDialog
        title="Delete observation"
        text={deleteError || `Delete "${deletingItem.name}" observed on ${deletingItem.observedAt}?`}
        acceptText="Delete"
        onClose={() => (deletingItem = null)}
        onCancel={() => (deletingItem = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

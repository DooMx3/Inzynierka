<script lang="ts">
    import { onMount } from "svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import { ApiError } from "$lib/api/auth";
    import {
        createSubstance,
        deleteSubstance,
        getSubstances,
        updateSubstance,
        type Substance,
    } from "$lib/api/substances";
    import { session } from "$lib/stores/session.svelte";

    let substances = $state<Substance[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("asc");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingSubstance = $state<Substance | null>(null);
    let formName = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingSubstance = $state<Substance | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            substances = await getSubstances();
        } catch (error) {
            substances = [];
            loadError =
                error instanceof ApiError && error.status === 403
                    ? "Only the organisation owner can manage substances."
                    : error instanceof Error
                      ? error.message
                      : "Could not load substances.";
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

    const visibleSubstances = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = substances.filter((item) =>
            needle ? item.name.toLowerCase().includes(needle) : true,
        );
        matched.sort((left, right) =>
            sort === "desc"
                ? right.name.localeCompare(left.name)
                : left.name.localeCompare(right.name),
        );
        return matched;
    });

    const openCreate = () => {
        editingSubstance = null;
        formName = "";
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (substance: Substance) => {
        editingSubstance = substance;
        formName = substance.name;
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        if (!formName.trim()) {
            formError = "Substance name is required.";
            return;
        }

        formPending = true;
        formError = "";
        try {
            if (editingSubstance) {
                await updateSubstance(editingSubstance.id, formName);
            } else {
                await createSubstance(formName);
            }
            formOpen = false;
            editingSubstance = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save substance.";
        } finally {
            formPending = false;
        }
    };

    const confirmDelete = async () => {
        if (!deletingSubstance || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteSubstance(deletingSubstance.id);
            deletingSubstance = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete substance.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">Only the organisation owner can manage substances.</p>
    {:else}
        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text="New substance" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What substance are you looking for?"
            searchPlaceholder="Search by substance name..."
            sortOptions={[
                { value: "asc", label: "Name (A-Z)" },
                { value: "desc", label: "Name (Z-A)" },
            ]}
            filterOptions={[{ value: "all", label: "All active" }]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading substances...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleSubstances} emptyLabel="No substances found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Name</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(substance, index)}
                        <TableRow {index}>
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">{substance.name}</td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="w-28">
                                    <Button
                                        svg={editIcon}
                                        text="Edit"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#6b4f3a] text-white fill-white"
                                        onClick={() => openEdit(substance)}
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
                                            deletingSubstance = substance;
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
        title={editingSubstance ? "Edit substance" : "Add new substance"}
        showBreadcrumbs={false}
        acceptText={editingSubstance ? "Save" : "Create"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <InputField
                label="Substance name"
                placeholder="e.g. Copper oxychloride"
                bind:value={formName}
                invalid={showValidation && !formName.trim()}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingSubstance}
    <ConfirmationDialog
        title="Delete substance"
        text={deleteError || `Deactivate "${deletingSubstance.name}"? It will stay linked to past sprayings.`}
        acceptText="Delete"
        onClose={() => (deletingSubstance = null)}
        onCancel={() => (deletingSubstance = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

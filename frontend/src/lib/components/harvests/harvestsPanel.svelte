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
    import { formatFieldLabel, getFields, type VineyardField } from "$lib/api/fields";
    import {
        createHarvest,
        deleteHarvest,
        getHarvests,
        updateHarvest,
        type HarvestRecord,
    } from "$lib/api/harvests";
    import { session } from "$lib/stores/session.svelte";

    let harvests = $state<HarvestRecord[]>([]);
    let fields = $state<VineyardField[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("date");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingHarvest = $state<HarvestRecord | null>(null);
    let selectedFieldIds = $state<string[]>([]);
    let formAmountKg = $state("");
    let formHarvestDate = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingHarvest = $state<HarvestRecord | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const canAccess = $derived(
        Boolean(session.user?.roles.some((role) => role === "WORKER" || role === "OWNER")),
    );

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [loadedHarvests, loadedFields] = await Promise.all([
                getHarvests(),
                getFields(),
            ]);
            harvests = loadedHarvests;
            fields = loadedFields;
        } catch (error) {
            harvests = [];
            loadError =
                error instanceof Error ? error.message : "Could not load harvest records.";
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

    const summarizeVarieties = (record: HarvestRecord) => {
        if (record.fields.length === 0) {
            return "—";
        }
        return record.fields.map((f) => f.grapeVarietyName).join(", ");
    };

    const summarizeColors = (record: HarvestRecord) => {
        const colors = [...new Set(record.fields.map((f) => f.grapeColor))];
        return colors.map((c) => (c === "RED" ? "Red" : "White")).join(" / ") || "—";
    };

    const visibleHarvests = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = harvests.filter((item) => {
            if (filter === "RED" || filter === "WHITE") {
                if (!item.fields.some((f) => f.grapeColor === filter)) {
                    return false;
                }
            } else if (filter !== "all" && !item.fields.some((f) => f.id === filter)) {
                return false;
            }

            if (!needle) {
                return true;
            }
            const haystack = [
                item.id,
                item.harvestDate,
                String(item.amountKg),
                ...item.fields.map((f) => `${f.grapeVarietyName} ${f.grapeColor}`),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "amount") {
                return right.amountKg - left.amountKg;
            }
            if (sort === "variety") {
                return summarizeVarieties(left).localeCompare(summarizeVarieties(right));
            }
            return right.harvestDate.localeCompare(left.harvestDate);
        });

        return matched;
    });

    const toggleField = (fieldId: string) => {
        selectedFieldIds = selectedFieldIds.includes(fieldId)
            ? selectedFieldIds.filter((id) => id !== fieldId)
            : [...selectedFieldIds, fieldId];
    };

    const openCreate = () => {
        editingHarvest = null;
        selectedFieldIds = fields[0] ? [fields[0].id] : [];
        formAmountKg = "";
        formHarvestDate = new Date().toISOString().slice(0, 10);
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (record: HarvestRecord) => {
        editingHarvest = record;
        selectedFieldIds = record.fields.map((f) => f.id);
        formAmountKg = String(record.amountKg);
        formHarvestDate = record.harvestDate;
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        const parsedAmount = Number(formAmountKg);
        if (selectedFieldIds.length === 0) {
            formError = "Select at least one vineyard field.";
            return;
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            formError = "Harvested amount must be greater than 0 kg.";
            return;
        }
        if (!formHarvestDate) {
            formError = "Harvest date is required.";
            return;
        }

        formPending = true;
        formError = "";
        try {
            const payload = {
                fieldIds: selectedFieldIds,
                amountKg: Math.round(parsedAmount),
                harvestDate: formHarvestDate,
            };
            if (editingHarvest) {
                await updateHarvest(editingHarvest.id, payload);
            } else {
                await createHarvest(payload);
            }
            formOpen = false;
            editingHarvest = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save harvest record.";
        } finally {
            formPending = false;
        }
    };

    const confirmDelete = async () => {
        if (!deletingHarvest || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteHarvest(deletingHarvest.id);
            deletingHarvest = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete harvest.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only vineyard workers and the organisation owner can manage harvests.
        </p>
    {:else}
        <div class="flex justify-end">
            <div class="w-52">
                <AddButton text="New harvest" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="What harvest are you looking for?"
            searchPlaceholder="Search by variety, year, amount, or color..."
            sortOptions={[
                { value: "date", label: "Harvest date" },
                { value: "amount", label: "Amount (kg)" },
                { value: "variety", label: "Grape variety" },
            ]}
            filterOptions={[
                { value: "all", label: "All harvests" },
                { value: "RED", label: "Red grapes" },
                { value: "WHITE", label: "White grapes" },
                ...fields.map((field) => ({ value: field.id, label: formatFieldLabel(field) })),
            ]}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading harvests...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleHarvests} emptyLabel="No harvest records found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Varieties</th>
                        <th class="px-4 py-3 font-bold">Type</th>
                        <th class="px-4 py-3 font-bold">Amount</th>
                        <th class="px-4 py-3 font-bold">Harvest date</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(record, index)}
                        <TableRow
                            {index}
                            expandLabel={`Expand fields for harvest on ${record.harvestDate}`}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">
                                    {summarizeVarieties(record)}
                                </td>
                                <td class="px-4 py-3">
                                    <StatusBadge
                                        label={summarizeColors(record)}
                                        tone={record.fields.some((f) => f.grapeColor === "RED")
                                            ? "dark"
                                            : "neutral"}
                                    />
                                </td>
                                <td class="px-4 py-3 font-semibold text-[#3f2e22]">
                                    {record.amountKg} kg
                                </td>
                                <td class="px-4 py-3">{record.harvestDate}</td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="w-28">
                                    <Button
                                        svg={editIcon}
                                        text="Edit"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#6b4f3a] text-white fill-white"
                                        onClick={() => openEdit(record)}
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
                                            deletingHarvest = record;
                                        }}
                                    />
                                </div>
                            {/snippet}
                            {#snippet details()}
                                <div class="flex flex-col gap-2 text-sm text-zinc-700">
                                    <span class="text-xs font-semibold uppercase text-zinc-500">
                                        Harvested fields ({record.fields.length})
                                    </span>
                                    <div class="flex flex-wrap gap-2">
                                        {#each record.fields as field (field.id)}
                                            <span
                                                class="rounded-lg border border-[#d9cbbd] bg-white px-3 py-1.5 text-xs font-medium text-[#3f2e22]"
                                            >
                                                {formatFieldLabel(field)}
                                            </span>
                                        {/each}
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
        title={editingHarvest ? "Edit harvest record" : "Add harvest record"}
        showBreadcrumbs={false}
        acceptText={editingHarvest ? "Save" : "Apply"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <span class="text-sm text-zinc-600">Vineyard fields</span>
                {#if fields.length === 0}
                    <p class="text-sm text-zinc-500">
                        No active fields available. Ask the vineyard owner to add fields first.
                    </p>
                {:else}
                    <div class="grid gap-2 sm:grid-cols-2">
                        {#each fields as field (field.id)}
                            {@const checked = selectedFieldIds.includes(field.id)}
                            <label
                                class={[
                                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                                    checked
                                        ? "border-[#6b4f3a] bg-[#efe6dc] text-[#3f2e22]"
                                        : "border-[#d9cbbd] bg-white text-zinc-700 hover:border-[#8c735c]",
                                ]}
                            >
                                <input
                                    type="checkbox"
                                    class="h-4 w-4 accent-[#6b4f3a]"
                                    {checked}
                                    onchange={() => toggleField(field.id)}
                                />
                                <span class="font-medium">{formatFieldLabel(field)}</span>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>

            <InputField
                label="Amount harvested (kg)"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 250"
                bind:value={formAmountKg}
                invalid={showValidation && (!Number.isFinite(Number(formAmountKg)) || Number(formAmountKg) <= 0)}
            />

            <InputField
                label="Harvest date"
                type="date"
                bind:value={formHarvestDate}
                invalid={showValidation && !formHarvestDate}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingHarvest}
    <ConfirmationDialog
        title="Delete harvest record"
        text={deleteError || `Delete harvest of ${deletingHarvest.amountKg} kg from ${deletingHarvest.harvestDate}?`}
        acceptText="Delete"
        onClose={() => (deletingHarvest = null)}
        onCancel={() => (deletingHarvest = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

<script lang="ts">
    import { onMount } from "svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import checkIcon from "$lib/assets/check.svg?raw";
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
    import { getEquipmentList, type Equipment } from "$lib/api/equipment";
    import { formatFieldLabel, getFields, type VineyardField } from "$lib/api/fields";
    import {
        createSpraying,
        deleteSpraying,
        getSprayings,
        isPlannedSpraying,
        toDateInputValue,
        updateSpraying,
        type SprayingRecord,
    } from "$lib/api/spraying";
    import { getSubstances, type Substance } from "$lib/api/substances";
    import { session } from "$lib/stores/session.svelte";

    let {
        mode = "completed",
    }: {
        mode?: "completed" | "planned";
    } = $props();

    let records = $state<SprayingRecord[]>([]);
    let fields = $state<VineyardField[]>([]);
    let equipmentList = $state<Equipment[]>([]);
    let substances = $state<Substance[]>([]);

    let loading = $state(true);
    let loadError = $state("");
    let substancesWarning = $state("");

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("date");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingRecord = $state<SprayingRecord | null>(null);
    let formFieldId = $state("");
    let formEquipmentId = $state("");
    let formSubstanceId = $state("");
    let formQuantity = $state("");
    let formSprayingDate = $state("");
    let formDueDate = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingRecord = $state<SprayingRecord | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const canAccess = $derived(
        Boolean(session.user?.roles.some((role) => role === "WORKER" || role === "OWNER")),
    );
    const isPlannedMode = $derived(mode === "planned");

    const load = async (showSpinner = records.length === 0) => {
        if (showSpinner) {
            loading = true;
        }
        loadError = "";
        substancesWarning = "";

        try {
            const [loadedSprayings, loadedFields, loadedEquipment] = await Promise.all([
                getSprayings(),
                getFields(),
                getEquipmentList(),
            ]);
            records = loadedSprayings;
            fields = loadedFields;
            equipmentList = loadedEquipment;
        } catch (error) {
            records = [];
            loadError =
                error instanceof Error ? error.message : "Could not load spraying records.";
            loading = false;
            return;
        }

        try {
            substances = await getSubstances();
        } catch (error) {
            substances = [];
            if (error instanceof ApiError && error.status === 403) {
                substancesWarning =
                    "Substance catalogue returned 403 for non-owner accounts on the current backend. Existing substance IDs are shown instead.";
            }
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

    const fieldById = $derived(new Map(fields.map((item) => [item.id, item])));
    const equipmentById = $derived(new Map(equipmentList.map((item) => [item.id, item])));
    const substanceById = $derived(new Map(substances.map((item) => [item.id, item])));

    const fieldLabel = (id: string) => {
        const found = fieldById.get(id);
        return found ? formatFieldLabel(found) : `Field ${id.slice(0, 8)}`;
    };

    const equipmentLabel = (id: string) => {
        const found = equipmentById.get(id);
        return found ? `${found.name} (${found.type})` : `Equipment ${id.slice(0, 8)}`;
    };

    const substanceLabel = (id: string) => {
        const found = substanceById.get(id);
        return found ? found.name : `Substance ${id.slice(0, 8)}`;
    };

    const filterOptions = $derived([
        { value: "all", label: "All fields" },
        ...fields.map((field) => ({
            value: field.id,
            label: formatFieldLabel(field),
        })),
    ]);

    const visibleRecords = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const now = new Date();

        const matched = records.filter((record) => {
            const planned = isPlannedSpraying(record, undefined, now);
            if (isPlannedMode !== planned) {
                return false;
            }
            if (filter !== "all" && record.fieldId !== filter) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                substanceLabel(record.substanceId),
                fieldLabel(record.fieldId),
                equipmentLabel(record.equipmentId),
                toDateInputValue(record.sprayingDate),
                toDateInputValue(record.due),
                String(record.quantity),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "field") {
                return fieldLabel(left.fieldId).localeCompare(fieldLabel(right.fieldId));
            }
            if (sort === "substance") {
                return substanceLabel(left.substanceId).localeCompare(
                    substanceLabel(right.substanceId),
                );
            }
            if (sort === "quantity") {
                return right.quantity - left.quantity;
            }
            const leftDate = isPlannedMode ? left.due : left.sprayingDate;
            const rightDate = isPlannedMode ? right.due : right.sprayingDate;
            return isPlannedMode
                ? leftDate.localeCompare(rightDate)
                : rightDate.localeCompare(leftDate);
        });

        return matched;
    });

    const isDueOverdue = (dueIso: string) => {
        if (!dueIso) {
            return false;
        }
        return Date.parse(dueIso) < Date.now();
    };

    const openCreate = () => {
        editingRecord = null;
        formFieldId = fields[0]?.id ?? "";
        formEquipmentId = equipmentList[0]?.id ?? "";
        formSubstanceId = substances[0]?.id ?? "";
        formQuantity = "";
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        formSprayingDate = isPlannedMode ? "" : today;
        formDueDate = isPlannedMode ? tomorrow : today;
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const openEdit = (record: SprayingRecord) => {
        editingRecord = record;
        formFieldId = record.fieldId;
        formEquipmentId = record.equipmentId;
        formSubstanceId = record.substanceId;
        formQuantity = String(record.quantity);
        formSprayingDate = toDateInputValue(record.sprayingDate);
        formDueDate = toDateInputValue(record.due);
        formError = "";
        showValidation = false;
        formOpen = true;
    };

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        const parsedQuantity = Number(formQuantity);
        if (!formFieldId || !formEquipmentId || !formSubstanceId) {
            formError = "Field, substance, and equipment must be selected.";
            return;
        }
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            formError = "Quantity must be a positive integer.";
            return;
        }
        if (isPlannedMode && !formDueDate) {
            formError = "Due date is required for a planned spraying.";
            return;
        }
        if (!isPlannedMode && !formSprayingDate) {
            formError = "Spraying date is required.";
            return;
        }

        formPending = true;
        formError = "";
        try {
            const payload = {
                fieldId: formFieldId,
                equipmentId: formEquipmentId,
                substanceId: formSubstanceId,
                quantity: Math.round(parsedQuantity),
                sprayingDate: isPlannedMode ? null : formSprayingDate,
                due: formDueDate || null,
            };
            if (editingRecord) {
                await updateSpraying(editingRecord.id, payload, isPlannedMode);
            } else {
                await createSpraying(payload, isPlannedMode);
            }
            formOpen = false;
            editingRecord = null;
            await load();
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save spraying record.";
        } finally {
            formPending = false;
        }
    };

    const markCompleted = async (record: SprayingRecord) => {
        try {
            await updateSpraying(
                record.id,
                {
                    fieldId: record.fieldId,
                    equipmentId: record.equipmentId,
                    substanceId: record.substanceId,
                    quantity: record.quantity,
                    sprayingDate: new Date().toISOString(),
                    due: record.due || null,
                },
                false,
            );
            await load();
        } catch (error) {
            loadError =
                error instanceof Error ? error.message : "Could not mark spraying as completed.";
        }
    };

    const confirmDelete = async () => {
        if (!deletingRecord || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteSpraying(deletingRecord.id);
            deletingRecord = null;
            await load();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete spraying.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only vineyard workers and the organisation owner can manage sprayings.
        </p>
    {:else}
        {#if substancesWarning}
            <div
                class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-3 text-sm text-[#3f2e22]"
                role="status"
            >
                {substancesWarning}
            </div>
        {/if}

        <div class="flex justify-end">
            <div class="w-fit min-w-60 max-w-full">
                <AddButton
                    text={isPlannedMode ? "New planned spraying" : "New spraying"}
                    onClick={openCreate}
                />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel={isPlannedMode
                ? "What planned spraying are you looking for?"
                : "What spraying record are you looking for?"}
            searchPlaceholder="Search by substance, field, equipment, or date..."
            sortOptions={[
                { value: "date", label: isPlannedMode ? "Due date" : "Spraying date" },
                { value: "field", label: "Field" },
                { value: "substance", label: "Substance" },
                { value: "quantity", label: "Quantity" },
            ]}
            {filterOptions}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading sprayings...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${mode}|${query}|${sort}|${filter}`}
                <ResultsTable
                    rows={visibleRecords}
                    emptyLabel={isPlannedMode
                        ? "No planned sprayings scheduled."
                        : "No completed spraying records found."}
                >
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Substance</th>
                        <th class="px-4 py-3 font-bold">Field</th>
                        <th class="px-4 py-3 font-bold">Quantity</th>
                        <th class="px-4 py-3 font-bold">
                            {isPlannedMode ? "Due date" : "Spraying date"}
                        </th>
                        <th class="px-4 py-3 font-bold">Status</th>
                        <th class="px-4 py-3"></th>
                    {/snippet}
                    {#snippet row(record, index)}
                        {@const equipment = equipmentById.get(record.equipmentId)}
                        <TableRow
                            {index}
                            highlighted={isPlannedMode && isDueOverdue(record.due)}
                            expandLabel={`Expand spraying details for ${substanceLabel(record.substanceId)}`}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3 font-medium text-[#3f2e22]">
                                    {substanceLabel(record.substanceId)}
                                </td>
                                <td class="px-4 py-3">{fieldLabel(record.fieldId)}</td>
                                <td class="px-4 py-3">{record.quantity} L</td>
                                <td class="px-4 py-3">
                                    {toDateInputValue(isPlannedMode ? record.due : record.sprayingDate)}
                                </td>
                                <td class="px-4 py-3">
                                    {#if isPlannedMode}
                                        {#if isDueOverdue(record.due)}
                                            <StatusBadge label="Overdue" tone="danger" />
                                        {:else}
                                            <StatusBadge label="Planned" tone="secondary" />
                                        {/if}
                                    {:else}
                                        <StatusBadge label="Completed" tone="primary" />
                                    {/if}
                                </td>
                            {/snippet}
                            {#snippet actions()}
                                {#if isPlannedMode}
                                    <div class="w-36">
                                        <Button
                                            svg={checkIcon}
                                            text="Complete"
                                            isFolded={false}
                                            gentle={true}
                                            class="bg-[#3f2e22] text-white fill-white"
                                            onClick={() => void markCompleted(record)}
                                        />
                                    </div>
                                {/if}
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
                                            deletingRecord = record;
                                        }}
                                    />
                                </div>
                            {/snippet}
                            {#snippet details()}
                                <div class="grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Equipment used
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {equipmentLabel(record.equipmentId)}
                                        </span>
                                        {#if equipment?.endOfTechnicalInspection}
                                            <span class="block text-xs text-zinc-500">
                                                Inspection valid until: {equipment.endOfTechnicalInspection}
                                            </span>
                                        {/if}
                                    </div>
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Scheduled due date
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {toDateInputValue(record.due) || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Recorded execution date
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {isPlannedMode
                                                ? "Pending execution"
                                                : toDateInputValue(record.sprayingDate)}
                                        </span>
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
        title={editingRecord
            ? isPlannedMode
                ? "Edit planned spraying"
                : "Edit spraying record"
            : isPlannedMode
              ? "Schedule planned spraying"
              : "Add spraying record"}
        showBreadcrumbs={false}
        acceptText={editingRecord ? "Save" : "Apply"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="spray-substance-select">Substance</label>
                {#if substances.length > 0}
                    <DropdownInput
                        id="spray-substance-select"
                        class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                        options={substances.map((s) => ({ value: s.id, label: s.name }))}
                        placeholder="Select substance"
                        bind:value={formSubstanceId}
                    />
                {:else}
                    <InputField
                        placeholder="Enter substance UUID"
                        bind:value={formSubstanceId}
                        invalid={showValidation && !formSubstanceId.trim()}
                    />
                {/if}
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="spray-field-select">Field</label>
                <DropdownInput
                    id="spray-field-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={fields.map((f) => ({ value: f.id, label: formatFieldLabel(f) }))}
                    placeholder="Select field"
                    bind:value={formFieldId}
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="spray-equipment-select">Equipment</label>
                <DropdownInput
                    id="spray-equipment-select"
                    class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                    options={equipmentList.map((e) => ({
                        value: e.id,
                        label: `${e.name} (${e.type})`,
                    }))}
                    placeholder="Select equipment"
                    bind:value={formEquipmentId}
                />
            </div>

            <InputField
                label="Quantity (L)"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 15"
                bind:value={formQuantity}
                invalid={showValidation && (!Number.isFinite(Number(formQuantity)) || Number(formQuantity) <= 0)}
            />

            {#if isPlannedMode}
                <InputField
                    label="Due date"
                    type="date"
                    bind:value={formDueDate}
                    invalid={showValidation && !formDueDate}
                />
            {:else}
                <InputField
                    label="Spraying date"
                    type="date"
                    bind:value={formSprayingDate}
                    invalid={showValidation && !formSprayingDate}
                />
                <InputField
                    label="Due date (optional)"
                    type="date"
                    bind:value={formDueDate}
                />
            {/if}

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingRecord}
    <ConfirmationDialog
        title="Delete spraying record"
        text={deleteError || `Delete spraying record for ${substanceLabel(deletingRecord.substanceId)} on ${fieldLabel(deletingRecord.fieldId)}?`}
        acceptText="Delete"
        onClose={() => (deletingRecord = null)}
        onCancel={() => (deletingRecord = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

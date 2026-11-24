<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import checkIcon from "$lib/assets/check.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import editIcon from "$lib/assets/edit.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import TaskFormModal from "./taskFormModal.svelte";
    import { getBatches, type ProductionBatch } from "$lib/api/batches";
    import { getEquipmentList, type Equipment } from "$lib/api/equipment";
    import { formatFieldLabel, getFields, type VineyardField } from "$lib/api/fields";
    import { getOrganisationMembers, type OrganisationMember } from "$lib/api/organisation";
    import { getSubstances, type Substance } from "$lib/api/substances";
    import {
        completeTask,
        createTask,
        DEFAULT_TASK_TYPE_OPTIONS,
        deleteTask,
        getTasks,
        getTaskTypes,
        isTaskOverdue,
        reopenTask,
        TASK_TYPE_LABELS,
        updateTask,
        type TaskDraft,
        type TaskItem,
        type TaskTypeOption,
    } from "$lib/api/tasks";
    import { session } from "$lib/stores/session.svelte";

    const TASK_ROLES = ["OWNER", "WORKER", "OENOLOGIST"] as const;

    let tasks = $state<TaskItem[]>([]);
    let taskTypes = $state<TaskTypeOption[]>(DEFAULT_TASK_TYPE_OPTIONS);
    let fields = $state<VineyardField[]>([]);
    let equipmentList = $state<Equipment[]>([]);
    let substances = $state<Substance[]>([]);
    let batches = $state<ProductionBatch[]>([]);
    let orgMembers = $state<OrganisationMember[]>([]);

    let loading = $state(true);
    let loadError = $state("");
    let actionError = $state("");
    let pendingTaskId = $state<string | null>(null);

    let query = $state("");
    let sort = $state("due");
    let filter = $state("all");

    let modalOpen = $state(false);
    let editingTask = $state<TaskItem | null>(null);

    let deletingTask = $state<TaskItem | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    const canAccess = $derived(
        Boolean(
            session.user?.roles?.some((role) =>
                TASK_ROLES.includes(role as (typeof TASK_ROLES)[number]),
            ),
        ),
    );
    const isOwner = $derived(Boolean(session.user?.roles?.includes("OWNER")));

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const ownerAccount = Boolean(session.user?.roles?.includes("OWNER"));
            const [
                loadedTasks,
                loadedTaskTypes,
                loadedEquipment,
                loadedFields,
                loadedSubstances,
                loadedBatches,
                loadedMembers,
            ] = await Promise.all([
                getTasks(),
                getTaskTypes().catch(() => DEFAULT_TASK_TYPE_OPTIONS),
                getEquipmentList().catch(() => []),
                getFields().catch(() => []),
                getSubstances().catch(() => []),
                getBatches().catch(() => []),
                ownerAccount
                    ? getOrganisationMembers().catch(() => [])
                    : Promise.resolve([]),
            ]);
            tasks = loadedTasks;
            taskTypes = loadedTaskTypes;
            equipmentList = loadedEquipment;
            fields = loadedFields;
            substances = loadedSubstances;
            batches = loadedBatches;
            orgMembers = loadedMembers;
        } catch (error) {
            tasks = [];
            loadError = error instanceof Error ? error.message : "Could not load tasks.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!canAccess) {
            loading = false;
            return;
        }
        if (page.url.searchParams.get("create") === "1") {
            editingTask = null;
            modalOpen = true;
        }
        void load();
    });

    const fieldById = $derived(new Map(fields.map((item) => [item.id, item])));
    const equipmentById = $derived(new Map(equipmentList.map((item) => [item.id, item])));
    const substanceById = $derived(new Map(substances.map((item) => [item.id, item])));
    const batchById = $derived(new Map(batches.map((item) => [item.id, item])));
    const memberById = $derived(new Map(orgMembers.map((item) => [item.id, item])));

    const memberOptions = $derived.by(() => {
        const list: { id: string; label: string }[] = [];
        const selfId = session.user?.id ?? "";
        if (session.user && selfId) {
            const fullName = [session.user.firstname, session.user.lastname]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(" ");
            const base = fullName ? `${fullName} (${session.user.email})` : session.user.email;
            list.push({ id: selfId, label: `${base} (You)` });
        }
        for (const member of orgMembers) {
            if (member.id === selfId || list.some((existing) => existing.id === member.id)) {
                continue;
            }
            const fullName = [member.firstname, member.lastname]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(" ");
            list.push({
                id: member.id,
                label: fullName ? `${fullName} (${member.email})` : member.email,
            });
        }
        return list;
    });

    const fieldLabel = (id: string | null): string | null => {
        if (!id) return null;
        const found = fieldById.get(id);
        return found ? formatFieldLabel(found) : `Field ${id.slice(0, 8)}`;
    };

    const equipmentLabel = (id: string | null): string | null => {
        if (!id) return null;
        const found = equipmentById.get(id);
        return found
            ? found.type
                ? `${found.name} (${found.type})`
                : found.name
            : `Equipment ${id.slice(0, 8)}`;
    };

    const substanceLabel = (id: string | null): string | null => {
        if (!id) return null;
        const found = substanceById.get(id);
        return found ? found.name : `Substance ${id.slice(0, 8)}`;
    };

    const batchLabel = (id: string | null): string | null => {
        if (!id) return null;
        const found = batchById.get(id);
        return found
            ? found.batchNumber
                ? `${found.name} (${found.batchNumber})`
                : found.name
            : `Batch ${id.slice(0, 8)}`;
    };

    const assigneeLabel = (userId: string): string => {
        if (!userId) {
            return "Unassigned";
        }
        if (session.user?.id === userId) {
            const fullName = [session.user.firstname, session.user.lastname]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(" ");
            return fullName ? `${fullName} (You)` : `${session.user.email} (You)`;
        }
        const found = memberById.get(userId);
        if (found) {
            const fullName = [found.firstname, found.lastname]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(" ");
            return fullName ? `${fullName} (${found.email})` : found.email;
        }
        return `User ${userId.slice(0, 8)}`;
    };

    const formatDate = (value: string | null): string => (value ? value.slice(0, 10) : "");

    const canToggleComplete = (task: TaskItem): boolean =>
        isOwner || Boolean(session.user?.id && task.assignedUserId === session.user.id);

    const canManageTask = (task: TaskItem): boolean =>
        isOwner || Boolean(session.user?.id && task.createdById === session.user.id);

    const visibleTasks = $derived.by(() => {
        const needle = query.trim().toLowerCase();

        const matched = tasks.filter((task) => {
            if (filter === "planned" && task.completed) {
                return false;
            }
            if (filter === "completed" && !task.completed) {
                return false;
            }
            if (filter === "overdue" && !isTaskOverdue(task)) {
                return false;
            }
            if (
                filter === "mine" &&
                (!session.user?.id || task.assignedUserId !== session.user.id)
            ) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                task.name,
                task.description,
                task.type,
                TASK_TYPE_LABELS[task.type] ?? "",
                fieldLabel(task.fieldId) ?? "",
                equipmentLabel(task.equipmentId) ?? "",
                substanceLabel(task.substanceId) ?? "",
                batchLabel(task.batchId) ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "name") {
                return left.name.localeCompare(right.name);
            }
            if (sort === "type") {
                const leftLabel = TASK_TYPE_LABELS[left.type] ?? left.type;
                const rightLabel = TASK_TYPE_LABELS[right.type] ?? right.type;
                return leftLabel.localeCompare(rightLabel) || left.name.localeCompare(right.name);
            }
            if (sort === "status") {
                const diff = Number(left.completed) - Number(right.completed);
                if (diff !== 0) return diff;
            }
            const leftDue = formatDate(left.dueDate) || "9999-99-99";
            const rightDue = formatDate(right.dueDate) || "9999-99-99";
            return leftDue.localeCompare(rightDue) || left.name.localeCompare(right.name);
        });

        return matched;
    });

    const openCreate = () => {
        editingTask = null;
        modalOpen = true;
    };

    const openEdit = (task: TaskItem) => {
        editingTask = task;
        modalOpen = true;
    };

    const handleSaveTask = async (draft: TaskDraft) => {
        if (editingTask) {
            const updated = await updateTask(editingTask.id, draft);
            tasks = tasks.map((item) => (item.id === updated.id ? updated : item));
        } else {
            const created = await createTask(draft);
            tasks = [created, ...tasks.filter((item) => item.id !== created.id)];
        }
        modalOpen = false;
        editingTask = null;
    };

    const handleToggleComplete = async (task: TaskItem) => {
        if (!canToggleComplete(task) || pendingTaskId) {
            return;
        }
        pendingTaskId = task.id;
        actionError = "";
        try {
            const updated = task.completed
                ? await reopenTask(task.id)
                : await completeTask(task.id);
            tasks = tasks.map((item) => (item.id === task.id ? updated : item));
        } catch (error) {
            actionError =
                error instanceof Error ? error.message : "Could not update task status.";
        } finally {
            pendingTaskId = null;
        }
    };

    const confirmDelete = async () => {
        if (!deletingTask || deletePending) {
            return;
        }
        const targetId = deletingTask.id;
        deletePending = true;
        deleteError = "";
        try {
            await deleteTask(targetId);
            tasks = tasks.filter((item) => item.id !== targetId);
            deletingTask = null;
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Could not delete task.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !canAccess}
        <p class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-3 text-sm text-[#3f2e22]">
            Tasks are available to vineyard owners, workers, and oenologists. Join or create an
            organisation to manage tasks.
        </p>
    {:else}
        <div class="flex justify-end">
            <div class="w-48">
                <AddButton text="New task" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query
            bind:sort
            bind:filter
            searchLabel="What task are you looking for?"
            searchPlaceholder="Search by name, description, type, field, equipment, substance, or batch..."
            sortOptions={[
                { value: "due", label: "Due date" },
                { value: "name", label: "Name" },
                { value: "type", label: "Type" },
                { value: "status", label: "Status" },
            ]}
            filterOptions={[
                { value: "all", label: "All tasks" },
                { value: "planned", label: "Planned (to do)" },
                { value: "completed", label: "Completed" },
                { value: "overdue", label: "Overdue" },
                { value: "mine", label: "Assigned to me" },
            ]}
            onSearch={() => {}}
        />

        {#if actionError}
            <p class="text-sm text-[#8f3d32]" role="alert">{actionError}</p>
        {/if}

        {#if loading}
            <p class="text-sm text-zinc-700">Loading tasks...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            <ResultsTable rows={visibleTasks} emptyLabel="No tasks match your current filters.">
                {#snippet head()}
                    <th class="px-4 py-3 font-bold">Name</th>
                    <th class="px-4 py-3 font-bold">Type</th>
                    <th class="px-4 py-3 font-bold">Due date</th>
                    <th class="px-4 py-3 font-bold">Status</th>
                    <th class="px-4 py-3 font-bold text-right">Actions</th>
                {/snippet}
                {#snippet row(task, index)}
                    {@const overdue = isTaskOverdue(task)}
                    <TableRow
                        {index}
                        expandOnRowClick={true}
                        highlighted={overdue}
                        expandLabel={`Toggle details for ${task.name}`}
                    >
                        {#snippet cells()}
                            <td class="px-4 py-3 font-medium text-[#3f2e22]">{task.name}</td>
                            <td class="px-4 py-3">
                                <StatusBadge
                                    label={TASK_TYPE_LABELS[task.type] ?? task.type}
                                    tone="neutral"
                                />
                            </td>
                            <td class="px-4 py-3">
                                {#if task.dueDate}
                                    <span class="inline-flex items-center gap-2">
                                        <span>{formatDate(task.dueDate)}</span>
                                        {#if overdue}
                                            <StatusBadge label="Due" tone="danger" />
                                        {/if}
                                    </span>
                                {:else}
                                    <span class="text-zinc-400">Not set</span>
                                {/if}
                            </td>
                            <td class="px-4 py-3">
                                {#if task.completed}
                                    <StatusBadge label="Completed" tone="success" />
                                {:else}
                                    <StatusBadge label="Planned" tone="secondary" />
                                {/if}
                            </td>
                        {/snippet}
                        {#snippet actions()}
                            <button
                                type="button"
                                disabled={!canToggleComplete(task) || pendingTaskId === task.id}
                                onclick={() => void handleToggleComplete(task)}
                                class={[
                                    "action-btn inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                                    task.completed
                                        ? "bg-[#8c735c] hover:bg-[#755f4b]"
                                        : "bg-[#3d6b47] hover:bg-[#32593b]",
                                ]}
                            >
                                {#if !task.completed}
                                    <span class="h-4 w-4 shrink-0" aria-hidden="true">
                                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                        {@html checkIcon}
                                    </span>
                                {/if}
                                <span>{task.completed ? "Reopen" : "Complete"}</span>
                            </button>
                            <button
                                type="button"
                                disabled={!canManageTask(task) || pendingTaskId === task.id}
                                onclick={() => openEdit(task)}
                                class="action-btn inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#6b4f3a] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5a4230] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <span class="h-4 w-4 shrink-0" aria-hidden="true">
                                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                    {@html editIcon}
                                </span>
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                disabled={!canManageTask(task) || pendingTaskId === task.id}
                                onclick={() => {
                                    deleteError = "";
                                    deletingTask = task;
                                }}
                                class="action-btn inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#8f3d32] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#783229] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <span class="h-4 w-4 shrink-0" aria-hidden="true">
                                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                    {@html closeIcon}
                                </span>
                                <span>Delete</span>
                            </button>
                        {/snippet}
                        {#snippet details()}
                            <div class="flex flex-col gap-3 text-sm text-zinc-700">
                                <div>
                                    <span class="block text-xs font-semibold uppercase text-zinc-500">
                                        Description
                                    </span>
                                    <p class="mt-0.5 whitespace-pre-wrap text-[#3f2e22]">
                                        {task.description.trim() || "No description provided."}
                                    </p>
                                </div>

                                <div class="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Assignee
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {assigneeLabel(task.assignedUserId)}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Started at
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {formatDate(task.startedAt) || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="block text-xs font-semibold uppercase text-zinc-500">
                                            Completed at
                                        </span>
                                        <span class="font-medium text-[#3f2e22]">
                                            {formatDate(task.completedAt) || "—"}
                                        </span>
                                    </div>
                                </div>

                                {#if task.fieldId || task.equipmentId || task.substanceId || task.batchId || task.bottlingId || task.recordId}
                                    <div class="grid gap-3 border-t border-[#e4d8cb] pt-2 sm:grid-cols-4">
                                        {#if task.fieldId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Field
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {fieldLabel(task.fieldId)}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if task.equipmentId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Equipment
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {equipmentLabel(task.equipmentId)}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if task.substanceId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Substance
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {substanceLabel(task.substanceId)}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if task.batchId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Batch
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {batchLabel(task.batchId)}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if task.bottlingId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Bottling
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {task.bottlingId}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if task.recordId}
                                            <div>
                                                <span class="block text-xs font-semibold uppercase text-zinc-500">
                                                    Record
                                                </span>
                                                <span class="font-medium text-[#3f2e22]">
                                                    {task.recordId}
                                                </span>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        {/snippet}
                    </TableRow>
                {/snippet}
            </ResultsTable>
        {/if}
    {/if}
</div>

{#if modalOpen}
    <TaskFormModal
        {editingTask}
        {taskTypes}
        {fields}
        {equipmentList}
        {substances}
        {batches}
        members={memberOptions}
        {isOwner}
        onClose={() => {
            modalOpen = false;
            editingTask = null;
        }}
        onSave={handleSaveTask}
    />
{/if}

{#if deletingTask}
    <ConfirmationDialog
        title="Delete task"
        text={deleteError || `Are you sure you want to delete "${deletingTask.name}"?`}
        acceptText="Delete"
        onClose={() => (deletingTask = null)}
        onCancel={() => (deletingTask = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

<style>
    .action-btn :global(svg) {
        height: 1rem;
        width: 1rem;
        fill: currentColor;
    }
</style>

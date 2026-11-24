<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import TextareaField from "$lib/components/textareaField/textareaField.svelte";
    import type { ProductionBatch } from "$lib/api/batches";
    import type { Equipment } from "$lib/api/equipment";
    import { formatFieldLabel, type VineyardField } from "$lib/api/fields";
    import type { Substance } from "$lib/api/substances";
    import {
        DEFAULT_TASK_TYPE_OPTIONS,
        TASK_TYPE_LABELS,
        type TaskDraft,
        type TaskItem,
        type TaskType,
        type TaskTypeOption,
    } from "$lib/api/tasks";
    import { displayName, session } from "$lib/stores/session.svelte";

    let {
        editingTask,
        taskTypes,
        fields,
        equipmentList,
        substances,
        batches,
        members,
        isOwner,
        onClose,
        onSave,
    }: {
        editingTask: TaskItem | null;
        taskTypes: TaskTypeOption[];
        fields: VineyardField[];
        equipmentList: Equipment[];
        substances: Substance[];
        batches: ProductionBatch[];
        members: { id: string; label: string }[];
        isOwner: boolean;
        onClose: () => void;
        onSave: (draft: TaskDraft) => Promise<void>;
    } = $props();

    const effectiveTaskTypes = $derived(
        taskTypes.length > 0 ? taskTypes : DEFAULT_TASK_TYPE_OPTIONS,
    );

    let formName = $derived(editingTask?.name ?? "");
    let formType = $derived<TaskType>(editingTask?.type ?? "GENERAL");
    let formDescription = $derived(editingTask?.description ?? "");
    let formStartedAt = $derived(editingTask?.startedAt?.slice(0, 10) ?? "");
    let formDueDate = $derived(editingTask?.dueDate?.slice(0, 10) ?? "");
    let formAssignedUserId = $derived(
        editingTask?.assignedUserId || session.user?.id || "",
    );
    let formFieldId = $derived(editingTask?.fieldId ?? "");
    let formEquipmentId = $derived(editingTask?.equipmentId ?? "");
    let formSubstanceId = $derived(editingTask?.substanceId ?? "");
    let formBatchId = $derived(editingTask?.batchId ?? "");
    let formBottlingId = $derived(editingTask?.bottlingId ?? "");
    let formRecordId = $derived(editingTask?.recordId ?? "");

    let showValidation = $state(false);
    let saving = $state(false);
    let formError = $state("");

    const optionForType = (type: string): TaskTypeOption =>
        effectiveTaskTypes.find((opt) => opt.type === type) ??
        DEFAULT_TASK_TYPE_OPTIONS.find((opt) => opt.type === type) ??
        DEFAULT_TASK_TYPE_OPTIONS[0]!;

    const activeOption = $derived(optionForType(formType));

    const typeDropdownOptions = $derived(
        effectiveTaskTypes.map((opt) => ({
            value: opt.type,
            label: TASK_TYPE_LABELS[opt.type] ?? opt.type,
        })),
    );

    const assigneeDropdownOptions = $derived.by(() => {
        if (members.length > 0) {
            return members.map((member) => ({ value: member.id, label: member.label }));
        }
        if (session.user?.id) {
            return [{ value: session.user.id, label: `${displayName(session.user)} (You)` }];
        }
        return [];
    });

    const fieldDropdownOptions = $derived([
        ...(activeOption.field === "OPTIONAL" ? [{ value: "", label: "None" }] : []),
        ...fields.map((field) => ({ value: field.id, label: formatFieldLabel(field) })),
    ]);

    const equipmentDropdownOptions = $derived([
        ...(activeOption.equipment === "OPTIONAL" ? [{ value: "", label: "None" }] : []),
        ...equipmentList.map((eq) => ({
            value: eq.id,
            label: eq.type ? `${eq.name} (${eq.type})` : eq.name,
        })),
    ]);

    const substanceDropdownOptions = $derived([
        ...(activeOption.substance === "OPTIONAL" ? [{ value: "", label: "None" }] : []),
        ...substances.map((sub) => ({ value: sub.id, label: sub.name })),
    ]);

    const batchDropdownOptions = $derived([
        ...(activeOption.batch === "OPTIONAL" ? [{ value: "", label: "None" }] : []),
        ...batches.map((batch) => ({
            value: batch.id,
            label: batch.batchNumber ? `${batch.name} (${batch.batchNumber})` : batch.name,
        })),
    ]);

    const handleTypeChange = (nextValue: string) => {
        const nextType = nextValue as TaskType;
        formType = nextType;
        const nextOption = optionForType(nextType);
        if (nextOption.field === "FORBIDDEN") {
            formFieldId = "";
        }
        if (nextOption.equipment === "FORBIDDEN") {
            formEquipmentId = "";
        }
        if (nextOption.substance === "FORBIDDEN") {
            formSubstanceId = "";
        }
        if (nextOption.batch === "FORBIDDEN") {
            formBatchId = "";
        }
        if (nextOption.bottling === "FORBIDDEN") {
            formBottlingId = "";
        }
        if (nextOption.record === "FORBIDDEN") {
            formRecordId = "";
        }
        formError = "";
    };

    const submit = async () => {
        if (saving) {
            return;
        }
        showValidation = true;
        formError = "";

        if (!formName.trim()) {
            formError = "Task name is required.";
            return;
        }

        const missing: string[] = [];
        if (activeOption.field === "REQUIRED" && !formFieldId.trim()) {
            missing.push("Field");
        }
        if (activeOption.equipment === "REQUIRED" && !formEquipmentId.trim()) {
            missing.push("Equipment");
        }
        if (activeOption.substance === "REQUIRED" && !formSubstanceId.trim()) {
            missing.push("Substance");
        }
        if (activeOption.batch === "REQUIRED" && !formBatchId.trim()) {
            missing.push("Batch");
        }
        if (activeOption.bottling === "REQUIRED" && !formBottlingId.trim()) {
            missing.push("Bottling");
        }
        if (activeOption.record === "REQUIRED" && !formRecordId.trim()) {
            missing.push("Record");
        }

        if (missing.length > 0) {
            formError = `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required for ${TASK_TYPE_LABELS[formType] ?? formType} tasks.`;
            return;
        }

        saving = true;
        try {
            await onSave({
                type: formType,
                name: formName.trim(),
                description: formDescription.trim() || null,
                assignedUserId: isOwner
                    ? formAssignedUserId || session.user?.id || null
                    : undefined,
                fieldId: activeOption.field !== "FORBIDDEN" ? formFieldId || null : null,
                equipmentId:
                    activeOption.equipment !== "FORBIDDEN" ? formEquipmentId || null : null,
                substanceId:
                    activeOption.substance !== "FORBIDDEN" ? formSubstanceId || null : null,
                batchId: activeOption.batch !== "FORBIDDEN" ? formBatchId || null : null,
                bottlingId: activeOption.bottling !== "FORBIDDEN" ? formBottlingId || null : null,
                recordId: activeOption.record !== "FORBIDDEN" ? formRecordId || null : null,
                startedAt: formStartedAt || null,
                dueDate: formDueDate || null,
            });
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not save task.";
        } finally {
            saving = false;
        }
    };
</script>

<FormWindow
    title={editingTask ? "Edit task" : "Create task"}
    showBreadcrumbs={false}
    acceptText={editingTask ? "Save" : "Create"}
    {onClose}
    onCancel={onClose}
    onAccept={() => void submit()}
>
    <div class="flex flex-col gap-4">
        <InputField
            label="Task name (required)"
            placeholder="e.g. Spray Solaris block against mildew"
            bind:value={formName}
            invalid={showValidation && !formName.trim()}
        />

        <div class="flex flex-col gap-1">
            <label class="text-sm text-zinc-600" for="task-type-select">Task type</label>
            <DropdownInput
                id="task-type-select"
                class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                options={typeDropdownOptions}
                placeholder="Select task type"
                value={formType}
                onchange={handleTypeChange}
            />
        </div>

        {#if isOwner}
            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="task-assignee-select">
                    Assigned employee
                </label>
                <DropdownInput
                    id="task-assignee-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={assigneeDropdownOptions}
                    placeholder="Select employee"
                    bind:value={formAssignedUserId}
                />
            </div>
        {/if}

        {#if activeOption.field !== "FORBIDDEN"}
            <div class="flex flex-col gap-1">
                <label
                    class={[
                        "text-sm",
                        showValidation && activeOption.field === "REQUIRED" && !formFieldId
                            ? "text-red-700/80"
                            : "text-zinc-600",
                    ]}
                    for="task-field-select"
                >
                    {activeOption.field === "REQUIRED" ? "Field (required)" : "Field"}
                </label>
                <DropdownInput
                    id="task-field-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={fieldDropdownOptions}
                    placeholder="Select field"
                    bind:value={formFieldId}
                />
            </div>
        {/if}

        {#if activeOption.equipment !== "FORBIDDEN"}
            <div class="flex flex-col gap-1">
                <label
                    class={[
                        "text-sm",
                        showValidation && activeOption.equipment === "REQUIRED" && !formEquipmentId
                            ? "text-red-700/80"
                            : "text-zinc-600",
                    ]}
                    for="task-equipment-select"
                >
                    {activeOption.equipment === "REQUIRED" ? "Equipment (required)" : "Equipment"}
                </label>
                <DropdownInput
                    id="task-equipment-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={equipmentDropdownOptions}
                    placeholder="Select equipment"
                    bind:value={formEquipmentId}
                />
            </div>
        {/if}

        {#if activeOption.substance !== "FORBIDDEN"}
            <div class="flex flex-col gap-1">
                <label
                    class={[
                        "text-sm",
                        showValidation && activeOption.substance === "REQUIRED" && !formSubstanceId
                            ? "text-red-700/80"
                            : "text-zinc-600",
                    ]}
                    for="task-substance-select"
                >
                    {activeOption.substance === "REQUIRED" ? "Substance (required)" : "Substance"}
                </label>
                <DropdownInput
                    id="task-substance-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={substanceDropdownOptions}
                    placeholder="Select substance"
                    bind:value={formSubstanceId}
                />
            </div>
        {/if}

        {#if activeOption.batch !== "FORBIDDEN"}
            <div class="flex flex-col gap-1">
                <label
                    class={[
                        "text-sm",
                        showValidation && activeOption.batch === "REQUIRED" && !formBatchId
                            ? "text-red-700/80"
                            : "text-zinc-600",
                    ]}
                    for="task-batch-select"
                >
                    {activeOption.batch === "REQUIRED" ? "Batch (required)" : "Batch"}
                </label>
                <DropdownInput
                    id="task-batch-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={batchDropdownOptions}
                    placeholder="Select batch"
                    bind:value={formBatchId}
                />
            </div>
        {/if}

        {#if activeOption.bottling !== "FORBIDDEN"}
            <InputField
                label={activeOption.bottling === "REQUIRED" ? "Bottling (required)" : "Bottling"}
                placeholder="Enter bottling ID"
                bind:value={formBottlingId}
                invalid={showValidation && activeOption.bottling === "REQUIRED" && !formBottlingId.trim()}
            />
        {/if}

        {#if activeOption.record !== "FORBIDDEN"}
            <InputField
                label={activeOption.record === "REQUIRED" ? "Record (required)" : "Record"}
                placeholder="Enter record ID"
                bind:value={formRecordId}
                invalid={showValidation && activeOption.record === "REQUIRED" && !formRecordId.trim()}
            />
        {/if}

        <TextareaField
            label="Description"
            placeholder="Optional instructions or notes..."
            rows={3}
            bind:value={formDescription}
        />

        <div class="grid gap-4 sm:grid-cols-2">
            <InputField label="Start date" type="date" bind:value={formStartedAt} />
            <InputField label="Due date" type="date" bind:value={formDueDate} />
        </div>

        {#if formError}
            <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
        {/if}
    </div>
</FormWindow>

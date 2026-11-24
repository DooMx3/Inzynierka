<script lang="ts">
    import { onMount } from "svelte";
    import checkIcon from "$lib/assets/check.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import {
        STAGE_LABELS,
        getBatches,
        type BatchStage,
        type ProductionBatch,
    } from "$lib/api/batches";
    import {
        formatFieldLabel,
        getFields,
        type VineyardField,
    } from "$lib/api/fields";
    import { getHarvests, type HarvestRecord } from "$lib/api/harvests";
    import {
        getOrganisationLogoByIdUrl,
        type Organisation,
    } from "$lib/api/organisation";
    import { getPestObservations, type PestObservation } from "$lib/api/pests";
    import {
        getPlannedSprayingIds,
        getSprayings,
        isPlannedSpraying,
        type SprayingRecord,
    } from "$lib/api/spraying";
    import {
        TASK_TYPE_LABELS,
        completeTask,
        getTasks,
        isTaskOverdue,
        type TaskItem,
    } from "$lib/api/tasks";
    import { session } from "$lib/stores/session.svelte";

    let {
        organisation,
        roles,
        logoTimestamp,
        onLeaveVineyard,
    }: {
        organisation: Organisation | null;
        roles: string[];
        logoTimestamp: number;
        onLeaveVineyard: () => void;
    } = $props();

    let tasks = $state<TaskItem[]>([]);
    let sprayings = $state<SprayingRecord[]>([]);
    let pestObservations = $state<PestObservation[]>([]);
    let harvests = $state<HarvestRecord[]>([]);
    let fields = $state<VineyardField[]>([]);
    let batches = $state<ProductionBatch[]>([]);
    let plannedSprayingIds = $state<Set<string>>(new Set());

    let loading = $state(true);
    let completingTaskId = $state<string | null>(null);
    let taskActionError = $state("");

    const isWorker = $derived(roles.includes("WORKER"));
    const isOenologist = $derived(roles.includes("OENOLOGIST"));
    const hasOperationalRole = $derived(isWorker || isOenologist);

    const PIPELINE_STAGES: { stage: BatchStage; title: string; href: string }[] = [
        { stage: "MUST", title: "Must", href: "/vinery/must" },
        { stage: "FERMENTING", title: "Fermenting", href: "/vinery/fermenting" },
        { stage: "AGED", title: "Aged", href: "/vinery/aged" },
        { stage: "BLENDED", title: "Blended", href: "/vinery/blended" },
        { stage: "BOTTLED", title: "Bottled", href: "/packed-products" },
    ];

    onMount(async () => {
        if (!roles.includes("WORKER") && !roles.includes("OENOLOGIST")) {
            loading = false;
            return;
        }

        plannedSprayingIds = getPlannedSprayingIds();
        const workerMode = roles.includes("WORKER");
        const oenologistMode = roles.includes("OENOLOGIST");

        const [
            loadedTasks,
            loadedSprayings,
            loadedPests,
            loadedHarvests,
            loadedFields,
            loadedBatches,
        ] = await Promise.all([
            getTasks().catch(() => []),
            workerMode ? getSprayings().catch(() => []) : Promise.resolve([]),
            workerMode ? getPestObservations().catch(() => []) : Promise.resolve([]),
            workerMode ? getHarvests().catch(() => []) : Promise.resolve([]),
            workerMode ? getFields().catch(() => []) : Promise.resolve([]),
            oenologistMode ? getBatches().catch(() => []) : Promise.resolve([]),
        ]);

        tasks = loadedTasks;
        sprayings = loadedSprayings;
        pestObservations = loadedPests;
        harvests = loadedHarvests;
        fields = loadedFields;
        batches = loadedBatches;
        loading = false;
    });

    const fieldById = $derived(new Map(fields.map((item) => [item.id, item])));

    const resolveFieldLabel = (fieldId: string): string => {
        if (!fieldId) {
            return "Parcel";
        }
        const found = fieldById.get(fieldId);
        return found ? formatFieldLabel(found) : `Field ${fieldId.slice(0, 8)}`;
    };

    const formatShortDate = (iso: string | null): string =>
        iso ? iso.slice(0, 10) : "—";

    const checklistTasks = $derived.by(() => {
        const selfId = session.user?.id ?? "";
        return [...tasks]
            .sort((left, right) => {
                const completeDiff = Number(left.completed) - Number(right.completed);
                if (completeDiff !== 0) return completeDiff;

                const overdueDiff =
                    Number(isTaskOverdue(right)) - Number(isTaskOverdue(left));
                if (overdueDiff !== 0) return overdueDiff;

                if (selfId) {
                    const leftMine = left.assignedUserId === selfId ? 1 : 0;
                    const rightMine = right.assignedUserId === selfId ? 1 : 0;
                    if (rightMine !== leftMine) return rightMine - leftMine;
                }

                const leftDue = formatShortDate(left.dueDate);
                const rightDue = formatShortDate(right.dueDate);
                const normalizedLeft = leftDue === "—" ? "9999-99-99" : leftDue;
                const normalizedRight = rightDue === "—" ? "9999-99-99" : rightDue;
                return (
                    normalizedLeft.localeCompare(normalizedRight) ||
                    left.name.localeCompare(right.name)
                );
            })
            .slice(0, 6);
    });

    const plannedSprayings = $derived.by(() => {
        const todayIso = new Date().toISOString().slice(0, 10);
        return sprayings
            .filter(
                (item) =>
                    isPlannedSpraying(item, plannedSprayingIds) ||
                    (Boolean(item.due) && item.due.slice(0, 10) >= todayIso),
            )
            .sort((a, b) => (a.due || a.sprayingDate).localeCompare(b.due || b.sprayingDate))
            .slice(0, 4);
    });

    const latestPests = $derived(
        [...pestObservations]
            .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
            .slice(0, 4),
    );

    const latestHarvests = $derived(
        [...harvests]
            .sort((a, b) => b.harvestDate.localeCompare(a.harvestDate))
            .slice(0, 4),
    );

    const pipelineStats = $derived(
        PIPELINE_STAGES.map((entry) => {
            const stageBatches = batches.filter((batch) => batch.stage === entry.stage);
            const activeCount = stageBatches.filter((batch) => !batch.isSpoiled).length;
            const totalLiters = Math.round(
                stageBatches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0),
            );
            return {
                ...entry,
                count: stageBatches.length,
                activeCount,
                totalLiters,
            };
        }),
    );

    const spoiledBatches = $derived(batches.filter((batch) => batch.isSpoiled));

    const stageHref = (stage: BatchStage): string => {
        const found = PIPELINE_STAGES.find((item) => item.stage === stage);
        return found ? found.href : "/vinery";
    };

    const handleCompleteTask = async (taskId: string) => {
        if (completingTaskId) {
            return;
        }
        completingTaskId = taskId;
        taskActionError = "";
        try {
            const updated = await completeTask(taskId);
            tasks = tasks.map((item) => (item.id === taskId ? updated : item));
        } catch (error) {
            taskActionError =
                error instanceof Error ? error.message : "Could not complete task.";
        } finally {
            completingTaskId = null;
        }
    };
</script>

<div
    class="mx-auto flex w-full max-w-7xl flex-col gap-5"
    aria-label="Employee operational workspace"
>
    <!-- Compact Operational Header Bar -->
    <header
        class="flex flex-col gap-4 rounded-xl border border-[#d9cbbd] border-l-4 border-l-[#6b4f3a] bg-[#f7f1ea] px-5 py-4 shadow-xs md:flex-row md:items-center md:justify-between"
        aria-label="Vineyard"
    >
        <div class="flex items-start gap-4 sm:items-center">
            {#if organisation?.id && organisation?.logoPath}
                <img
                    src="{getOrganisationLogoByIdUrl(organisation.id)}?t={logoTimestamp}"
                    alt="Vineyard logo"
                    class="h-14 w-14 shrink-0 rounded-lg border border-[#e4d8cb] bg-[#fbf7f2] p-1 object-contain"
                    onerror={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />
            {/if}
            <div class="flex flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-xl font-bold text-[#3f2e22] sm:text-2xl">
                        {organisation?.name || "You are part of the vineyard."}
                    </h2>
                    {#if isWorker}
                        <StatusBadge label="Vineyard Worker" tone="primary" />
                    {/if}
                    {#if isOenologist}
                        <StatusBadge label="Oenologist" tone="secondary" />
                    {/if}
                    {#if !hasOperationalRole}
                        <StatusBadge label="Awaiting role assignment" tone="neutral" />
                    {/if}
                </div>
                <p class="text-sm leading-relaxed text-zinc-700">
                    {#if organisation?.motto}
                        {organisation.motto}
                    {:else}
                        The rows, the work and the harvest are open to you. Leave only when you are ready to step away.
                    {/if}
                </p>
            </div>
        </div>

        <div class="w-full shrink-0 sm:w-48">
            <Button
                svg={closeIcon}
                text="Leave vineyard"
                isFolded={false}
                gentle={true}
                class="bg-[#8f3d32] text-white fill-white"
                onClick={onLeaveVineyard}
            />
        </div>
    </header>

    {#if !hasOperationalRole}
        <!-- Unassigned Member Onboarding Notice -->
        <section
            class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-6 text-[#3f2e22] shadow-xs"
            aria-label="Role assignment notice"
        >
            <h3 class="text-lg font-bold text-[#3f2e22]">
                Permissions not assigned yet
            </h3>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700">
                You have joined the vineyard, but the vineyard owner has not assigned
                <strong class="font-semibold text-[#3f2e22]">Vineyard Worker</strong> or
                <strong class="font-semibold text-[#3f2e22]">Oenologist</strong> permissions to your
                account yet. Once your role is assigned, your daily tasks and operational tools will
                appear here automatically.
            </p>
        </section>
    {:else}
        <!-- My Assigned & Upcoming Tasks Workspace -->
        <section
            class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-5 shadow-xs"
            aria-label="Assigned tasks workspace"
        >
            <div class="flex flex-col gap-3 border-b border-[#e4d8cb] pb-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 class="text-lg font-bold text-[#3f2e22]">
                        My Assigned &amp; Upcoming Tasks
                    </h3>
                    <p class="text-xs text-zinc-600">
                        Planned and overdue work items prioritized for your shift
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <a
                        href="/tasks?create=1"
                        class="inline-flex items-center rounded-lg bg-[#6b4f3a] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a4230]"
                    >
                        + New task
                    </a>
                    <a
                        href="/tasks"
                        class="inline-flex items-center rounded-lg border border-[#c4b6a6] bg-white px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:bg-[#f7f1ea]"
                    >
                        Open all tasks →
                    </a>
                </div>
            </div>

            {#if taskActionError}
                <p class="mt-3 text-sm text-[#8f3d32]" role="alert">{taskActionError}</p>
            {/if}

            <ul class="mt-3 divide-y divide-[#e4d8cb]">
                {#each checklistTasks as task (task.id)}
                    {@const overdue = isTaskOverdue(task)}
                    <li class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    class={[
                                        "font-semibold text-[#3f2e22]",
                                        task.completed && "line-through opacity-60",
                                    ]}
                                >
                                    {task.name}
                                </span>
                                <StatusBadge
                                    label={TASK_TYPE_LABELS[task.type] ?? task.type}
                                    tone="neutral"
                                />
                                {#if overdue}
                                    <StatusBadge label="Overdue" tone="danger" />
                                {/if}
                                {#if session.user?.id && task.assignedUserId === session.user.id}
                                    <span class="text-xs font-medium text-[#6b4f3a]">
                                        • Assigned to you
                                    </span>
                                {/if}
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                                <span>
                                    Due: {task.dueDate ? formatShortDate(task.dueDate) : "Not set"}
                                </span>
                                {#if task.description.trim()}
                                    <span class="line-clamp-1 max-w-xl text-zinc-500">
                                        {task.description}
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <div class="flex shrink-0 items-center gap-2">
                            {#if task.completed}
                                <StatusBadge label="Completed" tone="success" />
                            {:else}
                                <button
                                    type="button"
                                    disabled={completingTaskId === task.id}
                                    onclick={() => void handleCompleteTask(task.id)}
                                    class="complete-btn inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#3d6b47] px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#32593b] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span class="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                        {@html checkIcon}
                                    </span>
                                    <span>Complete</span>
                                </button>
                            {/if}
                        </div>
                    </li>
                {:else}
                    <li class="py-5 text-center text-sm text-zinc-500">
                        {loading
                            ? "Loading assigned tasks..."
                            : "No planned tasks waiting right now."}
                    </li>
                {/each}
            </ul>
        </section>

        <!-- Role-Specific Panel: WORKER -->
        {#if isWorker}
            <section
                class="rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs"
                aria-label="Field Work Operations"
            >
                <div class="flex flex-col gap-3 border-b border-[#e4d8cb] pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-[#3f2e22]">Field Work Operations</h3>
                        <p class="text-xs text-zinc-600">
                            Parcel protection schedules, vineyard scouting, and harvest intake
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <a
                            href="/agriculture/sprayings"
                            class="inline-flex items-center rounded-lg bg-[#6b4f3a] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a4230]"
                        >
                            Log Spraying
                        </a>
                        <a
                            href="/agriculture/pests"
                            class="inline-flex items-center rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:border-[#6b4f3a] hover:bg-white"
                        >
                            Report Pest/Disease
                        </a>
                        <a
                            href="/agriculture/harvests"
                            class="inline-flex items-center rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:border-[#6b4f3a] hover:bg-white"
                        >
                            Record Harvest
                        </a>
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <!-- Planned Sprayings -->
                    <div class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4">
                        <div class="mb-2.5 flex items-center justify-between">
                            <h4 class="text-sm font-bold text-[#3f2e22]">
                                Upcoming &amp; Overdue Sprayings
                            </h4>
                            <a
                                href="/agriculture/planned-sprayings"
                                class="text-xs font-semibold text-[#6b4f3a] hover:underline"
                            >
                                Schedule →
                            </a>
                        </div>
                        <ul class="divide-y divide-[#e4d8cb] text-sm">
                            {#each plannedSprayings as spraying (spraying.id)}
                                {@const overdue =
                                    Boolean(spraying.due) &&
                                    spraying.due.slice(0, 10) <
                                        new Date().toISOString().slice(0, 10)}
                                <li class="flex items-center justify-between gap-2 py-2">
                                    <div>
                                        <span class="block font-medium text-[#3f2e22]">
                                            {resolveFieldLabel(spraying.fieldId)}
                                        </span>
                                        <span class="text-xs text-zinc-500">
                                            Due {formatShortDate(spraying.due || spraying.sprayingDate)} • {spraying.quantity} L
                                        </span>
                                    </div>
                                    <StatusBadge
                                        label={overdue ? "Overdue" : "Planned"}
                                        tone={overdue ? "danger" : "secondary"}
                                    />
                                </li>
                            {:else}
                                <li class="py-4 text-center text-xs text-zinc-500">
                                    No planned sprayings scheduled.
                                </li>
                            {/each}
                        </ul>
                    </div>

                    <!-- Latest Pest / Disease Observations -->
                    <div class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4">
                        <div class="mb-2.5 flex items-center justify-between">
                            <h4 class="text-sm font-bold text-[#3f2e22]">
                                Latest Pest &amp; Disease Alerts
                            </h4>
                            <a
                                href="/agriculture/pests"
                                class="text-xs font-semibold text-[#6b4f3a] hover:underline"
                            >
                                Scouting →
                            </a>
                        </div>
                        <ul class="divide-y divide-[#e4d8cb] text-sm">
                            {#each latestPests as obs (obs.id)}
                                <li class="flex items-center justify-between gap-2 py-2">
                                    <div>
                                        <span class="block font-medium text-[#3f2e22]">
                                            {obs.name}
                                        </span>
                                        <span class="text-xs text-zinc-500">
                                            {resolveFieldLabel(obs.fieldId)} • {formatShortDate(obs.observedAt)}
                                        </span>
                                    </div>
                                    <StatusBadge
                                        label={obs.type}
                                        tone={obs.type === "DISEASE" ? "danger" : "secondary"}
                                    />
                                </li>
                            {:else}
                                <li class="py-4 text-center text-xs text-zinc-500">
                                    No active pest or disease observations.
                                </li>
                            {/each}
                        </ul>
                    </div>

                    <!-- Recent Harvests -->
                    <div class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4">
                        <div class="mb-2.5 flex items-center justify-between">
                            <h4 class="text-sm font-bold text-[#3f2e22]">Recent Harvests</h4>
                            <a
                                href="/agriculture/harvests"
                                class="text-xs font-semibold text-[#6b4f3a] hover:underline"
                            >
                                Harvest log →
                            </a>
                        </div>
                        <ul class="divide-y divide-[#e4d8cb] text-sm">
                            {#each latestHarvests as harvest (harvest.id)}
                                <li class="flex items-center justify-between gap-2 py-2">
                                    <div>
                                        <span class="block font-medium text-[#3f2e22]">
                                            {harvest.fields
                                                .map((f) => f.grapeVarietyName)
                                                .filter(Boolean)
                                                .join(", ") || "Vineyard parcel"}
                                        </span>
                                        <span class="text-xs text-zinc-500">
                                            {formatShortDate(harvest.harvestDate)}
                                        </span>
                                    </div>
                                    <span class="font-semibold text-[#6b4f3a]">
                                        {harvest.amountKg} kg
                                    </span>
                                </li>
                            {:else}
                                <li class="py-4 text-center text-xs text-zinc-500">
                                    No recent harvests recorded.
                                </li>
                            {/each}
                        </ul>
                    </div>
                </div>
            </section>
        {/if}

        <!-- Role-Specific Panel: OENOLOGIST -->
        {#if isOenologist}
            <section
                class="rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs"
                aria-label="Cellar Stage Pipeline"
            >
                <div class="flex flex-col gap-3 border-b border-[#e4d8cb] pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-[#3f2e22]">Cellar Stage Pipeline</h3>
                        <p class="text-xs text-zinc-600">
                            Live vinification progression from pressed must to bottled wine
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <a
                            href="/vinery/ingredients"
                            class="inline-flex items-center rounded-lg bg-[#6b4f3a] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#5a4230]"
                        >
                            Ingredients Catalogue
                        </a>
                        <a
                            href="/vinery"
                            class="inline-flex items-center rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:border-[#6b4f3a] hover:bg-white"
                        >
                            Winery Overview →
                        </a>
                    </div>
                </div>

                <!-- 5-Stage Pipeline Tracker -->
                <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {#each pipelineStats as item, idx (item.stage)}
                        <a
                            href={item.href}
                            class="group relative flex flex-col justify-between rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4 transition-all hover:border-[#6b4f3a] hover:bg-white hover:shadow-sm"
                        >
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                    Stage {idx + 1}
                                </span>
                                {#if idx < pipelineStats.length - 1}
                                    <span
                                        class="text-xs font-bold text-[#8c735c] transition-transform group-hover:translate-x-0.5"
                                        aria-hidden="true"
                                    >
                                        →
                                    </span>
                                {/if}
                            </div>
                            <span class="mt-1 text-base font-bold text-[#3f2e22]">
                                {item.title}
                            </span>
                            <div class="mt-3 flex items-baseline justify-between border-t border-[#e4d8cb] pt-2">
                                <span class="text-2xl font-bold text-[#6b4f3a]">
                                    {item.activeCount}
                                </span>
                                <span class="text-xs font-medium text-zinc-600">
                                    {item.totalLiters} L
                                </span>
                            </div>
                        </a>
                    {/each}
                </div>

                <!-- Spoiled / Attention Needed Batches Alert Box -->
                <div
                    class={[
                        "mt-4 rounded-xl border p-4",
                        spoiledBatches.length > 0
                            ? "border-[#8f3d32]/40 bg-[#fdf3f1]"
                            : "border-[#d9cbbd] bg-[#fbf7f2]",
                    ]}
                >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h4 class="text-sm font-bold text-[#3f2e22]">
                            Spoiled / Attention Needed Batches
                        </h4>
                        <StatusBadge
                            label={spoiledBatches.length > 0
                                ? `${spoiledBatches.length} spoiled`
                                : "Cellar healthy"}
                            tone={spoiledBatches.length > 0 ? "danger" : "success"}
                        />
                    </div>

                    {#if spoiledBatches.length > 0}
                        <ul class="mt-3 divide-y divide-[#8f3d32]/20 text-sm">
                            {#each spoiledBatches as batch (batch.id)}
                                <li class="flex flex-wrap items-center justify-between gap-2 py-2">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <StatusBadge label="SPOILED" tone="danger" />
                                        <span class="font-mono text-xs font-semibold text-[#6b4f3a]">
                                            {batch.batchNumber}
                                        </span>
                                        <span class="font-semibold text-[#3f2e22]">
                                            {batch.name}
                                        </span>
                                        <span class="text-xs text-zinc-600">
                                            ({STAGE_LABELS[batch.stage] ?? batch.stage} • {batch.quantity} L)
                                        </span>
                                    </div>
                                    <a
                                        href={stageHref(batch.stage)}
                                        class="text-xs font-semibold text-[#8f3d32] hover:underline"
                                    >
                                        Inspect batch →
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="mt-1.5 text-xs text-zinc-600">
                            All cellar batches are currently healthy — no spoiled lots blocking stage transitions.
                        </p>
                    {/if}
                </div>
            </section>
        {/if}
    {/if}
</div>

<style>
    .complete-btn :global(svg) {
        height: 0.875rem;
        width: 0.875rem;
        fill: currentColor;
    }
</style>

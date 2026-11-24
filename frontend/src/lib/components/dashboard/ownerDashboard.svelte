<script lang="ts">
    import { onMount } from "svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import {
        STAGE_LABELS,
        getBatches,
        type ProductionBatch,
    } from "$lib/api/batches";
    import { getFields, type VineyardField } from "$lib/api/fields";
    import { getHarvests, type HarvestRecord } from "$lib/api/harvests";
    import { getOfferings, type WineOffering } from "$lib/api/offerings";
    import {
        getOrganisationLogoByIdUrl,
        type Organisation,
    } from "$lib/api/organisation";
    import {
        getPlannedSprayingIds,
        getSprayings,
        isPlannedSpraying,
        type SprayingRecord,
    } from "$lib/api/spraying";
    import { getTasks, isTaskOverdue, type TaskItem } from "$lib/api/tasks";

    let {
        organisation,
        logoTimestamp,
    }: {
        organisation: Organisation | null;
        logoTimestamp: number;
    } = $props();

    let tasks = $state<TaskItem[]>([]);
    let fields = $state<VineyardField[]>([]);
    let harvests = $state<HarvestRecord[]>([]);
    let sprayings = $state<SprayingRecord[]>([]);
    let offerings = $state<WineOffering[]>([]);
    let batches = $state<ProductionBatch[]>([]);
    let plannedSprayingIds = $state<Set<string>>(new Set());
    let loading = $state(true);

    const managementLinks = [
        { label: "Vineyard", href: "/management/vineyard" },
        { label: "Offerings", href: "/management/offerings" },
        { label: "QR Codes", href: "/management/qr-codes" },
        { label: "Reports", href: "/raports" },
        { label: "Workers", href: "/workers" },
    ] as const;

    onMount(async () => {
        plannedSprayingIds = getPlannedSprayingIds();
        const [
            loadedTasks,
            loadedFields,
            loadedHarvests,
            loadedSprayings,
            loadedOfferings,
            loadedBatches,
        ] = await Promise.all([
            getTasks().catch(() => []),
            getFields().catch(() => []),
            getHarvests().catch(() => []),
            getSprayings().catch(() => []),
            getOfferings(organisation?.id || undefined).catch(() => []),
            getBatches().catch(() => []),
        ]);
        tasks = loadedTasks;
        fields = loadedFields;
        harvests = loadedHarvests;
        sprayings = loadedSprayings;
        offerings = loadedOfferings;
        batches = loadedBatches;
        loading = false;
    });

    const addressLine = $derived.by(() => {
        const street = organisation?.street?.trim() ?? "";
        const place = [organisation?.postalCode?.trim(), organisation?.city?.trim()]
            .filter(Boolean)
            .join(" ");
        return [street, place].filter(Boolean).join(", ");
    });

    const totalAreaAre = $derived(
        Math.round(
            fields.reduce((sum, field) => sum + (Number(field.areaAre) || 0), 0) * 10,
        ) / 10,
    );

    const activeBatchesCount = $derived(
        batches.filter((batch) => !batch.isSpoiled).length,
    );
    const spoiledBatchesCount = $derived(
        batches.filter((batch) => batch.isSpoiled).length,
    );

    const plannedTasksCount = $derived(
        tasks.filter((task) => !task.completed).length,
    );
    const overdueTasksCount = $derived(
        tasks.filter((task) => isTaskOverdue(task)).length,
    );

    const recentBatches = $derived(
        [...batches]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5),
    );

    const recentHarvests = $derived(
        [...harvests]
            .sort((a, b) => b.harvestDate.localeCompare(a.harvestDate))
            .slice(0, 5),
    );

    const currentOfferings = $derived(offerings.slice(0, 5));

    const recentSprayings = $derived(
        [...sprayings]
            .sort((a, b) => b.sprayingDate.localeCompare(a.sprayingDate))
            .slice(0, 5),
    );

    const formatShortDate = (iso: string): string => (iso ? iso.slice(0, 10) : "—");

    const formatHarvestGrapes = (harvest: HarvestRecord): string => {
        const varieties = [
            ...new Set(
                harvest.fields
                    .map((field) => field.grapeVarietyName.trim())
                    .filter(Boolean),
            ),
        ];
        return varieties.length > 0 ? varieties.join(", ") : "Estate parcels";
    };

    const sprayingStatus = (
        spraying: SprayingRecord,
    ): { label: string; tone: "danger" | "secondary" | "success" } => {
        const planned = isPlannedSpraying(spraying, plannedSprayingIds);
        const todayIso = new Date().toISOString().slice(0, 10);
        if (planned && spraying.due && spraying.due.slice(0, 10) < todayIso) {
            return { label: "Overdue", tone: "danger" };
        }
        if (planned) {
            return { label: "Planned", tone: "secondary" };
        }
        return { label: "Completed", tone: "success" };
    };
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6" aria-label="Owner executive dashboard">
    <!-- Top Executive Banner -->
    <section
        class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 shadow-sm"
        aria-label="Vineyard"
    >
        <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {#if organisation?.id && organisation?.logoPath}
                <img
                    src="{getOrganisationLogoByIdUrl(organisation.id)}?t={logoTimestamp}"
                    alt="Vineyard logo"
                    class="h-24 w-24 shrink-0 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-1.5 object-contain"
                    onerror={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />
            {/if}
            <div class="flex flex-col gap-1.5">
                <div class="flex flex-wrap items-center gap-2.5">
                    <h2 class="text-2xl font-bold text-[#3f2e22] sm:text-3xl">
                        {organisation?.name || "Your vineyard"}
                    </h2>
                    <StatusBadge label="Owner" tone="dark" />
                </div>
                <p class="max-w-2xl text-base leading-relaxed text-zinc-700">
                    {#if organisation?.motto}
                        {organisation.motto}
                    {:else}
                        Executive overview of your vineyard parcels, cellar batches, team assignments, and wine offerings.
                    {/if}
                </p>
                {#if addressLine || organisation?.taxId}
                    <p class="text-xs font-medium text-zinc-500">
                        {[
                            addressLine,
                            organisation?.taxId ? `Tax ID: ${organisation.taxId}` : "",
                        ]
                            .filter(Boolean)
                            .join(" • ")}
                    </p>
                {/if}
            </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#e4d8cb] pt-4">
            <span class="mr-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Quick management:
            </span>
            {#each managementLinks as link (link.href)}
                <a
                    href={link.href}
                    class="inline-flex items-center rounded-full border border-[#c4b6a6] bg-[#fbf7f2] px-4 py-1.5 text-xs font-semibold text-[#3f2e22] transition-colors hover:border-[#6b4f3a] hover:bg-[#6b4f3a] hover:text-white"
                >
                    {link.label}
                </a>
            {/each}
        </div>
    </section>

    <!-- Owner KPI Summary Strip -->
    <section
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Vineyard KPI summary"
    >
        <div class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Vineyard Parcels
            </span>
            <div class="mt-2 flex items-baseline gap-2">
                <span class="text-3xl font-bold text-[#3f2e22]">{fields.length}</span>
                <span class="text-sm font-medium text-[#6b4f3a]">{totalAreaAre} ar</span>
            </div>
            <span class="mt-1 block text-xs text-zinc-600">
                Registered parcels &amp; cultivated area
            </span>
        </div>

        <div class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Production Batches
            </span>
            <div class="mt-2 flex flex-wrap items-center gap-2.5">
                <span class="text-3xl font-bold text-[#3f2e22]">{activeBatchesCount}</span>
                <StatusBadge
                    label={`${spoiledBatchesCount} spoiled`}
                    tone={spoiledBatchesCount > 0 ? "danger" : "neutral"}
                />
            </div>
            <span class="mt-1 block text-xs text-zinc-600">
                Active healthy batches across cellar stages
            </span>
        </div>

        <div class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Team Tasks
            </span>
            <div class="mt-2 flex flex-wrap items-center gap-2.5">
                <span class="text-3xl font-bold text-[#3f2e22]">{plannedTasksCount}</span>
                <StatusBadge
                    label={`${overdueTasksCount} overdue`}
                    tone={overdueTasksCount > 0 ? "danger" : "neutral"}
                />
            </div>
            <span class="mt-1 block text-xs text-zinc-600">
                Planned assignments across field &amp; cellar
            </span>
        </div>

        <div class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Vineyard Offerings
            </span>
            <div class="mt-2 flex items-baseline gap-2">
                <span class="text-3xl font-bold text-[#3f2e22]">{offerings.length}</span>
                <span class="text-sm font-medium text-[#6b4f3a]">wines</span>
            </div>
            <span class="mt-1 block text-xs text-zinc-600">
                Active wines on offer for your vineyard
            </span>
        </div>
    </section>

    <!-- 2x2 Overview Tables / Cards -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <!-- 1. Recent Batches -->
        <section class="flex flex-col rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <div class="mb-3 flex items-center justify-between gap-2">
                <h3 class="text-lg font-bold text-[#3f2e22]">Recent Batches</h3>
                <a
                    href="/vinery"
                    class="text-xs font-semibold text-[#6b4f3a] hover:text-[#3f2e22] hover:underline"
                >
                    Open winery →
                </a>
            </div>
            <div class="overflow-x-auto rounded-xl border border-[#d9cbbd] bg-[#fbf7f2]">
                <table class="w-full border-collapse text-left text-sm">
                    <thead class="bg-[#e4d8cb] text-xs font-bold uppercase tracking-wide text-[#3f2e22]">
                        <tr>
                            <th class="px-3.5 py-2.5">Batch #</th>
                            <th class="px-3.5 py-2.5">Name</th>
                            <th class="px-3.5 py-2.5">Stage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each recentBatches as batch (batch.id)}
                            <tr class="border-t border-[#e4d8cb] bg-white odd:bg-[#fbf7f2]">
                                <td class="px-3.5 py-2.5 font-mono text-xs font-semibold text-[#6b4f3a]">
                                    {batch.batchNumber}
                                </td>
                                <td class="px-3.5 py-2.5 font-medium text-[#3f2e22]">
                                    {batch.name}
                                </td>
                                <td class="px-3.5 py-2.5">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <StatusBadge
                                            label={STAGE_LABELS[batch.stage] ?? batch.stage}
                                            tone="neutral"
                                        />
                                        {#if batch.isSpoiled}
                                            <StatusBadge label="SPOILED" tone="danger" />
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-sm text-zinc-500">
                                    {loading ? "Loading batches..." : "No production batches recorded yet."}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- 2. Recent Harvests -->
        <section class="flex flex-col rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <div class="mb-3 flex items-center justify-between gap-2">
                <h3 class="text-lg font-bold text-[#3f2e22]">Recent Harvests</h3>
                <a
                    href="/agriculture/harvests"
                    class="text-xs font-semibold text-[#6b4f3a] hover:text-[#3f2e22] hover:underline"
                >
                    Open harvests →
                </a>
            </div>
            <div class="overflow-x-auto rounded-xl border border-[#d9cbbd] bg-[#fbf7f2]">
                <table class="w-full border-collapse text-left text-sm">
                    <thead class="bg-[#e4d8cb] text-xs font-bold uppercase tracking-wide text-[#3f2e22]">
                        <tr>
                            <th class="px-3.5 py-2.5">Date</th>
                            <th class="px-3.5 py-2.5">Grape Varieties</th>
                            <th class="px-3.5 py-2.5 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each recentHarvests as harvest (harvest.id)}
                            <tr class="border-t border-[#e4d8cb] bg-white odd:bg-[#fbf7f2]">
                                <td class="px-3.5 py-2.5 text-zinc-700">
                                    {formatShortDate(harvest.harvestDate)}
                                </td>
                                <td class="px-3.5 py-2.5 font-medium text-[#3f2e22]">
                                    {formatHarvestGrapes(harvest)}
                                </td>
                                <td class="px-3.5 py-2.5 text-right font-semibold text-[#6b4f3a]">
                                    {harvest.amountKg} kg
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-sm text-zinc-500">
                                    {loading ? "Loading harvests..." : "No harvests logged yet."}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- 3. Current Offerings -->
        <section class="flex flex-col rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <div class="mb-3 flex items-center justify-between gap-2">
                <h3 class="text-lg font-bold text-[#3f2e22]">Current Offerings</h3>
                <a
                    href="/management/offerings"
                    class="text-xs font-semibold text-[#6b4f3a] hover:text-[#3f2e22] hover:underline"
                >
                    Manage offerings →
                </a>
            </div>
            <div class="overflow-x-auto rounded-xl border border-[#d9cbbd] bg-[#fbf7f2]">
                <table class="w-full border-collapse text-left text-sm">
                    <thead class="bg-[#e4d8cb] text-xs font-bold uppercase tracking-wide text-[#3f2e22]">
                        <tr>
                            <th class="px-3.5 py-2.5">Wine</th>
                            <th class="px-3.5 py-2.5">Style</th>
                            <th class="px-3.5 py-2.5 text-right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each currentOfferings as offering (offering.id)}
                            <tr class="border-t border-[#e4d8cb] bg-white odd:bg-[#fbf7f2]">
                                <td class="px-3.5 py-2.5 font-medium text-[#3f2e22]">
                                    {offering.wineName}
                                </td>
                                <td class="px-3.5 py-2.5 text-zinc-600">
                                    {offering.wineStyle || "Estate wine"}
                                </td>
                                <td class="px-3.5 py-2.5 text-right font-semibold text-[#6b4f3a]">
                                    {offering.price} PLN
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-sm text-zinc-500">
                                    {loading ? "Loading offerings..." : "No wine offerings published yet."}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- 4. Recent & Planned Sprayings -->
        <section class="flex flex-col rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 shadow-xs">
            <div class="mb-3 flex items-center justify-between gap-2">
                <h3 class="text-lg font-bold text-[#3f2e22]">Recent &amp; Planned Sprayings</h3>
                <a
                    href="/agriculture/sprayings"
                    class="text-xs font-semibold text-[#6b4f3a] hover:text-[#3f2e22] hover:underline"
                >
                    Open sprayings →
                </a>
            </div>
            <div class="overflow-x-auto rounded-xl border border-[#d9cbbd] bg-[#fbf7f2]">
                <table class="w-full border-collapse text-left text-sm">
                    <thead class="bg-[#e4d8cb] text-xs font-bold uppercase tracking-wide text-[#3f2e22]">
                        <tr>
                            <th class="px-3.5 py-2.5">Date / Due</th>
                            <th class="px-3.5 py-2.5">Quantity</th>
                            <th class="px-3.5 py-2.5">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each recentSprayings as spraying (spraying.id)}
                            {@const status = sprayingStatus(spraying)}
                            <tr class="border-t border-[#e4d8cb] bg-white odd:bg-[#fbf7f2]">
                                <td class="px-3.5 py-2.5 text-zinc-700">
                                    <span class="block font-medium text-[#3f2e22]">
                                        {formatShortDate(spraying.sprayingDate)}
                                    </span>
                                    {#if spraying.due}
                                        <span class="block text-xs text-zinc-500">
                                            Due {formatShortDate(spraying.due)}
                                        </span>
                                    {/if}
                                </td>
                                <td class="px-3.5 py-2.5 font-semibold text-[#6b4f3a]">
                                    {spraying.quantity} L
                                </td>
                                <td class="px-3.5 py-2.5">
                                    <StatusBadge label={status.label} tone={status.tone} />
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-sm text-zinc-500">
                                    {loading ? "Loading sprayings..." : "No spraying treatments recorded yet."}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>
    </div>
</div>

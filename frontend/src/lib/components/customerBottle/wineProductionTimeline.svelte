<script lang="ts">
    let {
        grapeVariety,
        harvestDate,
        fermentationStart,
        fermentationEnd,
        barrelType,
        barrelDuration,
        bottledDate,
    }: {
        grapeVariety: string;
        harvestDate: string;
        fermentationStart: string | null;
        fermentationEnd: string | null;
        barrelType: string | null;
        barrelDuration: string | null;
        bottledDate: string;
    } = $props();

    const fermentationSummary = $derived.by(() => {
        if (fermentationStart && fermentationEnd) {
            return `${fermentationStart} → ${fermentationEnd}`;
        }
        if (fermentationStart) {
            return `Started ${fermentationStart}`;
        }
        if (fermentationEnd) {
            return `Completed ${fermentationEnd}`;
        }
        return "Estate cellar fermentation";
    });

    const resolvedBarrelType = $derived(
        barrelType?.trim() ? barrelType : "Stainless steel — un-oaked",
    );

    const resolvedBarrelDuration = $derived(
        barrelDuration?.trim()
            ? barrelDuration
            : "Bottled fresh without barrel aging",
    );
</script>

<ol
    class="relative grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-5"
    aria-label="Wine production journey"
>
    <!-- Step 1: Grape Harvest -->
    <li class="relative flex gap-4 lg:flex-col lg:gap-3">
        <div class="flex flex-col items-center lg:flex-row lg:items-center">
            <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#6b4f3a] bg-[#6b4f3a] text-sm font-bold text-white shadow-sm"
                aria-hidden="true"
            >
                1
            </span>
            <span
                class="my-1 w-0.5 flex-1 bg-[#d9cbbd] lg:mx-2 lg:my-0 lg:h-0.5 lg:w-auto"
                aria-hidden="true"
            ></span>
        </div>

        <div class="flex flex-1 flex-col gap-2 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4 shadow-xs">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold tracking-wide text-[#8c735c] uppercase">
                    Stage 1
                </span>
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#6b4f3a]" fill="currentColor" aria-hidden="true">
                    <circle cx="9" cy="10" r="2.5" />
                    <circle cx="15" cy="10" r="2.5" />
                    <circle cx="12" cy="14.5" r="2.5" />
                    <circle cx="12" cy="19" r="2.2" />
                    <path d="M12 3 C12 5.5 14 6.5 16 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" />
                </svg>
            </div>
            <h3 class="text-base font-bold text-[#3f2e22]">Grape Harvest</h3>
            <dl class="mt-1 flex flex-col gap-1.5 text-xs">
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Grape variety</dt>
                    <dd class="text-sm font-semibold text-[#3f2e22]">{grapeVariety}</dd>
                </div>
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Harvest date</dt>
                    <dd class="font-medium text-[#3f2e22]">{harvestDate}</dd>
                </div>
            </dl>
        </div>
    </li>

    <!-- Step 2: Fermentation -->
    <li class="relative flex gap-4 lg:flex-col lg:gap-3">
        <div class="flex flex-col items-center lg:flex-row lg:items-center">
            <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#6b4f3a] bg-[#6b4f3a] text-sm font-bold text-white shadow-sm"
                aria-hidden="true"
            >
                2
            </span>
            <span
                class="my-1 w-0.5 flex-1 bg-[#d9cbbd] lg:mx-2 lg:my-0 lg:h-0.5 lg:w-auto"
                aria-hidden="true"
            ></span>
        </div>

        <div class="flex flex-1 flex-col gap-2 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4 shadow-xs">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold tracking-wide text-[#8c735c] uppercase">
                    Stage 2
                </span>
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#6b4f3a]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M9 3h6M10 3v5l-4.5 7.5A2 2 0 0 0 7.2 19h9.6a2 2 0 0 0 1.7-3.5L14 8V3" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="10.5" cy="14.5" r="1" fill="currentColor" />
                    <circle cx="13.5" cy="16" r="1" fill="currentColor" />
                </svg>
            </div>
            <h3 class="text-base font-bold text-[#3f2e22]">Fermentation</h3>
            <dl class="mt-1 flex flex-col gap-1.5 text-xs">
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Cellar fermentation period</dt>
                    <dd class="text-sm font-semibold text-[#3f2e22]">
                        {fermentationSummary}
                    </dd>
                </div>
            </dl>
        </div>
    </li>

    <!-- Step 3: Barrel Maturation -->
    <li class="relative flex gap-4 lg:flex-col lg:gap-3">
        <div class="flex flex-col items-center lg:flex-row lg:items-center">
            <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#6b4f3a] bg-[#6b4f3a] text-sm font-bold text-white shadow-sm"
                aria-hidden="true"
            >
                3
            </span>
            <span
                class="my-1 w-0.5 flex-1 bg-[#d9cbbd] lg:mx-2 lg:my-0 lg:h-0.5 lg:w-auto"
                aria-hidden="true"
            ></span>
        </div>

        <div class="flex flex-1 flex-col gap-2 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4 shadow-xs">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold tracking-wide text-[#8c735c] uppercase">
                    Stage 3
                </span>
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#6b4f3a]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <ellipse cx="12" cy="5" rx="6" ry="2.2" />
                    <path d="M6 5c-1.8 4.5-1.8 9.5 0 14c1.5 1.3 10.5 1.3 12 0c1.8-4.5 1.8-9.5 0-14" />
                    <path d="M5 9.5h14M5 14.5h14" />
                </svg>
            </div>
            <h3 class="text-base font-bold text-[#3f2e22]">Barrel Maturation</h3>
            <dl class="mt-1 flex flex-col gap-1.5 text-xs">
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Maturation vessel</dt>
                    <dd class="text-sm font-semibold text-[#3f2e22]">
                        {resolvedBarrelType}
                    </dd>
                </div>
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Time spent in barrel</dt>
                    <dd class="font-medium text-[#3f2e22]">
                        {resolvedBarrelDuration}
                    </dd>
                </div>
            </dl>
        </div>
    </li>

    <!-- Step 4: Bottling -->
    <li class="relative flex gap-4 lg:flex-col lg:gap-3">
        <div class="flex flex-col items-center lg:flex-row lg:items-center">
            <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#3f2e22] bg-[#3f2e22] text-sm font-bold text-white shadow-sm"
                aria-hidden="true"
            >
                4
            </span>
        </div>

        <div class="flex flex-1 flex-col gap-2 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4 shadow-xs">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold tracking-wide text-[#8c735c] uppercase">
                    Stage 4
                </span>
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#6b4f3a]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M10 2h4v4c0 1.5 2.5 2.5 2.5 5v9a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20v-9c0-2.5 2.5-3.5 2.5-5V2Z" stroke-linejoin="round" />
                    <rect x="9.5" y="12" width="5" height="5" rx="0.8" />
                </svg>
            </div>
            <h3 class="text-base font-bold text-[#3f2e22]">Bottling</h3>
            <dl class="mt-1 flex flex-col gap-1.5 text-xs">
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Bottled on</dt>
                    <dd class="text-sm font-semibold text-[#3f2e22]">{bottledDate}</dd>
                </div>
                <div class="flex flex-col">
                    <dt class="text-zinc-500">Status</dt>
                    <dd class="font-medium text-[#3d6b47]">Estate sealed & verified</dd>
                </div>
            </dl>
        </div>
    </li>
</ol>

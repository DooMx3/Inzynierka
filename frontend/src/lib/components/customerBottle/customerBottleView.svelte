<script lang="ts">
    import { onMount } from "svelte";
    import NutrientsTable from "$lib/components/nutrients/nutrientsTable.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import WineProductionTimeline from "./wineProductionTimeline.svelte";
    import {
        getCustomerBottleDetails,
        type CustomerBottleDetails,
    } from "$lib/api/offerings";

    let {
        bottleId,
    }: {
        bottleId: string;
    } = $props();

    let details = $state<CustomerBottleDetails | null>(null);
    let loading = $state(true);
    let errorMessage = $state("");
    let logoHidden = $state(false);

    const loadDetails = async () => {
        if (!bottleId) {
            loading = false;
            errorMessage = "Missing wine bottle identifier.";
            return;
        }
        loading = true;
        errorMessage = "";
        logoHidden = false;
        try {
            details = await getCustomerBottleDetails(bottleId);
        } catch (error) {
            details = null;
            errorMessage =
                error instanceof Error
                    ? error.message
                    : "Wine bottle details could not be loaded.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        void loadDetails();
    });

    const truncateLabel = (text: string, maxLen: number): string =>
        text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-6">
    <div>
        <a
            href="/offerings"
            class="inline-flex items-center gap-1.5 rounded-full border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-2 text-sm font-semibold text-[#3f2e22] shadow-xs transition-colors hover:bg-[#e4d8cb]"
        >
            ← Back to offerings
        </a>
    </div>

    {#if loading}
        <section
            class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-8 text-center text-sm text-zinc-600 shadow-sm"
            aria-live="polite"
        >
            Loading bottle provenance and nutritional details...
        </section>
    {:else if errorMessage || !details}
        <section
            class="flex flex-col items-center gap-3 rounded-2xl border border-[#8f3d32] bg-[#fbf7f2] p-8 text-center shadow-sm"
            role="alert"
        >
            <h1 class="text-lg font-bold text-[#8f3d32]">Bottle record unavailable</h1>
            <p class="max-w-md text-sm text-zinc-700">
                {errorMessage || "We could not find provenance data for this wine bottle."}
            </p>
            <a
                href="/offerings"
                class="mt-1 rounded-xl bg-[#6b4f3a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
            >
                Browse our wine offerings
            </a>
        </section>
    {:else}
        <!-- Bottle & Vineyard Hero Section -->
        <section
            class="overflow-hidden rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] text-[#3f2e22] shadow-sm"
            aria-label="Wine bottle overview"
        >
            <div class="grid grid-cols-1 gap-6 p-6 md:grid-cols-[240px_1fr] md:p-8">
                <!-- Stylized SVG Wine Bottle with Warm Dark-Brown/Gold Label -->
                <div
                    class="flex items-center justify-center rounded-2xl border border-[#e4d8cb] bg-[#fbf7f2] p-5"
                >
                    <svg
                        viewBox="0 0 180 320"
                        class="h-72 w-44 drop-shadow-md select-none"
                        role="img"
                        aria-label={`Wine bottle label for ${details.wineName}`}
                    >
                        <ellipse cx="90" cy="304" rx="54" ry="8" fill="#e4d8cb" />
                        <!-- Bottle body -->
                        <path
                            d="M74 18 H106 V58 C106 78 138 94 138 132 V284 C138 295 130 302 119 302 H61 C50 302 42 295 42 284 V132 C42 94 74 78 74 58 Z"
                            fill="#2d1e15"
                            stroke="#1c120c"
                            stroke-width="2"
                        />
                        <!-- Capsule & gold foil collar -->
                        <rect x="73" y="14" width="34" height="28" rx="4" fill="#6b4f3a" />
                        <rect x="73" y="38" width="34" height="5" fill="#c9a46a" />
                        <!-- Glass sheen -->
                        <path
                            d="M52 136 C52 108 69 92 78 68 V288 H52 Z"
                            fill="#ffffff"
                            opacity="0.06"
                        />
                        <!-- Warm dark-brown & gold bottle front label -->
                        <rect
                            x="50"
                            y="136"
                            width="80"
                            height="118"
                            rx="6"
                            fill="#3f2e22"
                            stroke="#c9a46a"
                            stroke-width="2"
                        />
                        <rect
                            x="54"
                            y="140"
                            width="72"
                            height="110"
                            rx="4"
                            fill="none"
                            stroke="#c9a46a"
                            stroke-width="0.7"
                            opacity="0.75"
                        />
                        <!-- Vineyard crest -->
                        <circle
                            cx="90"
                            cy="156"
                            r="7"
                            fill="none"
                            stroke="#c9a46a"
                            stroke-width="1.2"
                        />
                        <path d="M87 156 L90 151 L93 156 L90 161 Z" fill="#c9a46a" />
                        <!-- Label typography -->
                        <text
                            x="90"
                            y="173"
                            text-anchor="middle"
                            fill="#e4d3c0"
                            font-size="6.5"
                            font-weight="600"
                            letter-spacing="0.8"
                        >
                            {truncateLabel(details.vineyardName.toUpperCase(), 22)}
                        </text>
                        <line x1="62" y1="179" x2="118" y2="179" stroke="#c9a46a" stroke-width="0.8" />
                        <text
                            x="90"
                            y="196"
                            text-anchor="middle"
                            fill="#fbf7f2"
                            font-size="8.5"
                            font-weight="700"
                        >
                            {truncateLabel(`${details.wineName} (${details.vintageYear})`, 20)}
                        </text>
                        <text
                            x="90"
                            y="213"
                            text-anchor="middle"
                            fill="#d9b882"
                            font-size="7.5"
                            font-weight="600"
                        >
                            {`${details.wineStyle} · ${details.vintageYear}`}
                        </text>
                        <line x1="66" y1="223" x2="114" y2="223" stroke="#8c735c" stroke-width="0.8" />
                        <text
                            x="90"
                            y="239"
                            text-anchor="middle"
                            fill="#fbf7f2"
                            font-size="8"
                            font-weight="700"
                        >
                            {`${details.parameters.alcoholContent}% ABV · 750 ml`}
                        </text>
                    </svg>
                </div>

                <!-- Vineyard & Bottle Details -->
                <div class="flex flex-col justify-between gap-5">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                {#if details.logoUrl && !logoHidden}
                                    <img
                                        src={details.logoUrl}
                                        alt={`${details.vineyardName} logo`}
                                        onerror={() => (logoHidden = true)}
                                        class="h-12 w-12 rounded-xl border border-[#d9cbbd] bg-white object-contain p-1 shadow-xs"
                                    />
                                {/if}
                                <div class="flex flex-col">
                                    <span class="text-xs font-semibold tracking-wider text-[#8c735c] uppercase">
                                        Verified Vineyard Provenance
                                    </span>
                                    <span class="text-base font-bold text-[#6b4f3a]">
                                        {details.vineyardName}
                                    </span>
                                </div>
                            </div>

                            {#if details.price != null}
                                <span
                                    class="rounded-full bg-[#6b4f3a] px-4 py-1.5 text-base font-bold text-white shadow-sm"
                                >
                                    {details.price} PLN
                                </span>
                            {/if}
                        </div>

                        <div class="flex flex-col gap-2">
                            <h1 class="text-2xl leading-tight font-bold text-[#3f2e22] sm:text-3xl">
                                {details.wineName}
                            </h1>
                            <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                <StatusBadge label={details.wineStyle} tone="secondary" />
                                <StatusBadge
                                    label={`Vintage ${details.vintageYear}`}
                                    tone="neutral"
                                />
                            </div>
                        </div>

                        <p class="rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4 text-sm leading-relaxed italic text-zinc-700">
                            {details.description}
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e4d8cb] pt-3 text-xs text-zinc-600">
                        <span>
                            <strong class="text-[#3f2e22]">Format:</strong> 750 ml glass bottle
                        </span>
                        <span>
                            <strong class="text-[#3f2e22]">Traceability:</strong> Vineyard-to-bottle verified
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Final Wine Parameters Card -->
        <section
            class="flex flex-col gap-4 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
            aria-label="Final wine parameters"
        >
            <div class="flex flex-col gap-0.5">
                <h2 class="text-lg font-bold text-[#3f2e22]">Final Wine Parameters</h2>
                <p class="text-xs text-zinc-600">
                    Laboratory and cellar measurements recorded at bottling.
                </p>
            </div>

            <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="flex flex-col gap-1 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
                    <dt class="text-xs font-medium text-zinc-600">Sugar level</dt>
                    <dd class="text-xl font-bold text-[#3f2e22]">
                        {details.parameters.sugarLevel != null
                            ? `${details.parameters.sugarLevel} g/L`
                            : "—"}
                    </dd>
                </div>

                <div class="flex flex-col gap-1 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
                    <dt class="text-xs font-medium text-zinc-600">Acidity</dt>
                    <dd class="text-xl font-bold text-[#3f2e22]">
                        {details.parameters.acidity != null
                            ? `${details.parameters.acidity} g/L`
                            : "—"}
                    </dd>
                </div>

                <div class="flex flex-col gap-1 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
                    <dt class="text-xs font-medium text-zinc-600">pH</dt>
                    <dd class="text-xl font-bold text-[#3f2e22]">
                        {details.parameters.pH != null ? `${details.parameters.pH}` : "—"}
                    </dd>
                </div>

                <div class="flex flex-col gap-1 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
                    <dt class="text-xs font-medium text-zinc-600">Alcohol content</dt>
                    <dd class="text-xl font-bold text-[#3f2e22]">
                        {`${details.parameters.alcoholContent}% vol.`}
                    </dd>
                </div>
            </dl>
        </section>

        <!-- Production Journey Flowchart -->
        <section
            class="flex flex-col gap-4 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
            aria-label="Production journey"
        >
            <div class="flex flex-col gap-0.5">
                <h2 class="text-lg font-bold text-[#3f2e22]">Production Journey</h2>
                <p class="text-xs text-zinc-600">
                    Complete traceability from vineyard grape harvest through maturation to bottling.
                </p>
            </div>

            <WineProductionTimeline
                grapeVariety={details.grapeVariety}
                harvestDate={details.harvestDate}
                fermentationStart={details.fermentationStart}
                fermentationEnd={details.fermentationEnd}
                barrelType={details.barrelType}
                barrelDuration={details.barrelDuration}
                bottledDate={details.bottledDate}
            />
        </section>

        <!-- Table of Nutrients Card -->
        <section
            class="flex flex-col gap-4 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
            aria-label="Nutritional information"
        >
            <div class="flex flex-col gap-0.5">
                <h2 class="text-lg font-bold text-[#3f2e22]">Table of Nutrients</h2>
                <p class="text-xs text-zinc-600">
                    Average nutritional values calculated per 100 ml of bottled wine.
                </p>
            </div>

            <NutrientsTable nutrients={details.nutrients} editable={false} />
        </section>
    {/if}
</div>

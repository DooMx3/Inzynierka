<script lang="ts">
    import type { WineOffering } from "$lib/api/offerings";

    let {
        offering,
    }: {
        offering: WineOffering;
    } = $props();

    const resolvedStyle = $derived(offering.wineStyle ?? "Dry wine");
    const resolvedAbv = $derived(offering.alcoholPercent ?? 12.5);
    const resolvedVintage = $derived(offering.vintageYear ?? 2026);
    const resolvedBarrel = $derived(offering.barrelInfo ?? "Stainless steel");
    const resolvedGrape = $derived(offering.grapeType ?? "Estate Cuvée");
    const resolvedDescription = $derived(
        offering.wineDescription?.trim() ||
            "Estate-bottled wine crafted with full vineyard-to-bottle provenance.",
    );
</script>

<article
    class="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] text-[#3f2e22] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfa992] hover:shadow-md"
>
    <div class="relative flex items-center justify-center border-b border-[#e4d8cb] bg-[#fbf7f2] px-5 pt-6 pb-5">
        <span
            class="absolute top-3.5 right-3.5 rounded-full bg-[#6b4f3a] px-3.5 py-1 text-sm font-bold text-white shadow-sm"
        >
            {offering.price} PLN
        </span>

        {#if offering.organisationName}
            <span
                class="absolute top-3.5 left-3.5 max-w-[55%] truncate rounded-full border border-[#d9cbbd] bg-[#f7f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#6b4f3a]"
                title={offering.organisationName}
            >
                {offering.organisationName}
            </span>
        {/if}

        <svg
            viewBox="0 0 120 180"
            class="h-36 w-24 drop-shadow-sm"
            role="img"
            aria-label={`Bottle emblem for ${offering.wineName}`}
        >
            <!-- Soft warm halo -->
            <ellipse cx="60" cy="166" rx="34" ry="6" fill="#e4d8cb" />
            <!-- Bottle silhouette -->
            <path
                d="M52 14 H68 V34 C68 44 84 54 84 74 V154 C84 160 79 164 73 164 H47 C41 164 36 160 36 154 V74 C36 54 52 44 52 34 Z"
                fill="#3f2e22"
                stroke="#2a1e16"
                stroke-width="1.5"
            />
            <!-- Foil capsule & gold ring -->
            <rect x="51" y="12" width="18" height="14" rx="2.5" fill="#6b4f3a" />
            <rect x="51" y="24" width="18" height="3" fill="#c9a46a" />
            <!-- Bottle glass highlight -->
            <path
                d="M42 76 C42 62 50 52 54 42 V154 H42 Z"
                fill="#ffffff"
                opacity="0.07"
            />
            <!-- Warm cream estate label -->
            <rect
                x="41"
                y="80"
                width="38"
                height="56"
                rx="4"
                fill="#fbf7f2"
                stroke="#c9a46a"
                stroke-width="1.4"
            />
            <line x1="46" y1="90" x2="74" y2="90" stroke="#c9a46a" stroke-width="1" />
            <circle cx="60" cy="103" r="6" fill="none" stroke="#6b4f3a" stroke-width="1.2" />
            <path d="M57 103 L60 99 L63 103 L60 107 Z" fill="#8c735c" />
            <line x1="47" y1="117" x2="73" y2="117" stroke="#8c735c" stroke-width="1.2" />
            <line x1="50" y1="124" x2="70" y2="124" stroke="#c4b6a6" stroke-width="1" />
        </svg>
    </div>

    <div class="flex flex-1 flex-col gap-4 p-5">
        <div class="flex flex-col gap-1.5">
            <h2 class="text-lg leading-snug font-bold text-[#3f2e22]">
                {offering.wineName}
            </h2>
            <p class="line-clamp-3 text-sm leading-relaxed italic text-zinc-600">
                {resolvedDescription}
            </p>
        </div>

        <dl class="flex flex-col divide-y divide-[#e4d8cb] rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] px-3.5 py-1.5 text-xs">
            <div class="flex items-center justify-between gap-2 py-1.5">
                <dt class="font-medium text-zinc-600">Style</dt>
                <dd class="text-right font-semibold text-[#3f2e22]">{resolvedStyle}</dd>
            </div>
            <div class="flex items-center justify-between gap-2 py-1.5">
                <dt class="font-medium text-zinc-600">Alcohol</dt>
                <dd class="text-right font-semibold text-[#3f2e22]">{resolvedAbv}%</dd>
            </div>
            <div class="flex items-center justify-between gap-2 py-1.5">
                <dt class="font-medium text-zinc-600">Vintage</dt>
                <dd class="text-right font-semibold text-[#3f2e22]">{resolvedVintage}</dd>
            </div>
            <div class="flex items-center justify-between gap-2 py-1.5">
                <dt class="font-medium text-zinc-600">Barrel</dt>
                <dd class="truncate text-right font-semibold text-[#3f2e22]" title={resolvedBarrel}>
                    {resolvedBarrel}
                </dd>
            </div>
            <div class="flex items-center justify-between gap-2 py-1.5">
                <dt class="font-medium text-zinc-600">Grape type</dt>
                <dd class="truncate text-right font-semibold text-[#3f2e22]" title={resolvedGrape}>
                    {resolvedGrape}
                </dd>
            </div>
        </dl>

        <div class="mt-auto pt-1">
            <a
                href={`/offerings/${encodeURIComponent(offering.id)}`}
                class="flex w-full items-center justify-center rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3f2e22]"
            >
                View bottle provenance →
            </a>
        </div>
    </div>
</article>

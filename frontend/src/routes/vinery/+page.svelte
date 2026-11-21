<script lang="ts">
    const stages = [
        {
            title: "Must",
            description: "Create and monitor pressed grape must batches from vineyard harvests.",
            href: "/vinery/must",
        },
        {
            title: "Fermenting must",
            description: "Track active fermentation, yeast & sugar additions, predicted alcohol, and SO2.",
            href: "/vinery/fermenting",
        },
        {
            title: "Aged wine",
            description: "Manage barrel and tank maturation batches, chemical readings, and spoilage status.",
            href: "/vinery/aged",
        },
        {
            title: "Blended wine",
            description: "Combine fermented and aged wine batches into final cuvées.",
            href: "/vinery/blended",
        },
        {
            title: "Bottled wine",
            description: "Finalize bottled wine batches and manage nutrition tables.",
            href: "/packed-products",
        },
        {
            title: "Ingredients Catalogue",
            description: "Maintain production additives and their nutritional profiles per 100 g.",
            href: "/vinery/ingredients",
        },
    ];
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each stages as stage (stage.href)}
        <a
            href={stage.href}
            class="flex flex-col justify-between gap-3 rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 text-[#3f2e22] shadow-sm transition-all hover:border-[#6b4f3a] hover:bg-[#fbf7f2]"
        >
            <div class="flex flex-col gap-2">
                <h2 class="text-lg font-semibold text-[#3f2e22]">{stage.title}</h2>
                <p class="text-sm leading-relaxed text-zinc-600">{stage.description}</p>
            </div>
            <span class="text-sm font-semibold text-[#6b4f3a]">Open stage →</span>
        </a>
    {/each}
</div>

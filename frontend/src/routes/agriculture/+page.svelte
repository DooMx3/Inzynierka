<script lang="ts">
    const modules = [
        {
            title: "Completed Sprayings",
            description: "Inspect and log completed field treatments, quantities, and equipment used.",
            href: "/agriculture/sprayings",
        },
        {
            title: "Planned Sprayings",
            description: "Schedule upcoming vineyard sprayings with due dates and mark them completed.",
            href: "/agriculture/planned-sprayings",
        },
        {
            title: "Pests & Plant Diseases",
            description: "Record observed pests and plant diseases on specific vineyard fields.",
            href: "/agriculture/pests",
        },
        {
            title: "Grape Harvests",
            description: "Track harvested grape quantities, dates, and contributing vineyard fields.",
            href: "/agriculture/harvests",
        },
    ];
</script>

<div class="grid gap-4 sm:grid-cols-2">
    {#each modules as mod (mod.href)}
        <a
            href={mod.href}
            class="flex flex-col justify-between gap-3 rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 text-[#3f2e22] shadow-sm transition-all hover:border-[#6b4f3a] hover:bg-[#fbf7f2]"
        >
            <div class="flex flex-col gap-2">
                <h2 class="text-lg font-semibold text-[#3f2e22]">{mod.title}</h2>
                <p class="text-sm leading-relaxed text-zinc-600">{mod.description}</p>
            </div>
            <span class="text-sm font-semibold text-[#6b4f3a]">Open module →</span>
        </a>
    {/each}
</div>

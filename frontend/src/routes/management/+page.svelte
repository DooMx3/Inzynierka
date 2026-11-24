<script lang="ts">
    const modules = [
        {
            title: "Winery & Vineyard Equipment",
            description: "Manage presses, fermentors, barrels, mixers, and technical inspection dates.",
            href: "/management/equipment",
        },
        {
            title: "Vineyard Fields",
            description: "Register vineyard parcels, planted grape varieties, grape colors, and areas.",
            href: "/management/fields",
        },
        {
            title: "Spraying Substances",
            description: "Maintain the approved list of vineyard protection substances for field work.",
            href: "/management/substances",
        },
        {
            title: "Wine Offerings",
            description: "Manage public wine offerings, prices, and customer bottle provenance pages.",
            href: "/management/offerings",
        },
        {
            title: "QR Code Generator",
            description: "Generate printable QR codes for winery equipment and bottled wine offerings.",
            href: "/management/qr-codes",
        },
    ];
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each modules as mod (mod.href)}
        <a
            href={mod.href}
            class="flex flex-col justify-between gap-3 rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-5 text-[#3f2e22] shadow-sm transition-all hover:border-[#6b4f3a] hover:bg-[#fbf7f2]"
        >
            <div class="flex flex-col gap-2">
                <h2 class="text-lg font-semibold text-[#3f2e22]">{mod.title}</h2>
                <p class="text-sm leading-relaxed text-zinc-600">{mod.description}</p>
            </div>
            <span class="text-sm font-semibold text-[#6b4f3a]">Open catalogue →</span>
        </a>
    {/each}
</div>

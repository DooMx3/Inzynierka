<script lang="ts">
    export type SectionTab = {
        label: string;
        href: string;
        badge?: string | number;
        exact?: boolean;
    };

    let {
        tabs,
        currentPath = "",
        ariaLabel = "Section navigation",
    }: {
        tabs: SectionTab[];
        currentPath?: string;
        ariaLabel?: string;
    } = $props();

    const isActive = (tab: SectionTab) =>
        tab.exact
            ? currentPath === tab.href
            : currentPath === tab.href ||
              (tab.href !== "/" && currentPath.startsWith(`${tab.href}/`));
</script>

<nav
    aria-label={ariaLabel}
    class="flex flex-wrap items-center gap-2 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-2 shadow-sm"
>
    {#each tabs as tab (tab.href)}
        {@const active = isActive(tab)}
        <a
            href={tab.href}
            aria-current={active ? "page" : undefined}
            class={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                    ? "bg-[#6b4f3a] text-white shadow-sm"
                    : "text-[#3f2e22] hover:bg-[#e4d8cb]",
            ]}
        >
            <span>{tab.label}</span>
            {#if tab.badge !== undefined}
                <span
                    class={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        active ? "bg-white/20 text-white" : "bg-[#e4d8cb] text-[#3f2e22]",
                    ]}
                >
                    {tab.badge}
                </span>
            {/if}
        </a>
    {/each}
</nav>

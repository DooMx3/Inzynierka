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
    class="flex max-w-full flex-nowrap sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-1.5 sm:p-2 shadow-sm"
>
    {#each tabs as tab (tab.href)}
        {@const active = isActive(tab)}
        <a
            href={tab.href}
            aria-current={active ? "page" : undefined}
            class={[
                "inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors",
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

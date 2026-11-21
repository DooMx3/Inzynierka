<script lang="ts">
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import SectionTabs from "$lib/components/sectionTabs/sectionTabs.svelte";
    import { session } from "$lib/stores/session.svelte";

    let { children }: { children: Snippet } = $props();

    const tabs = [
        { label: "Sprayings", href: "/agriculture/sprayings" },
        { label: "Planned sprayings", href: "/agriculture/planned-sprayings" },
        { label: "Pests & diseases", href: "/agriculture/pests" },
        { label: "Harvests", href: "/agriculture/harvests" },
    ];

    const canAccess = $derived(
        Boolean(
            session.user?.roles.some((role) => role === "WORKER" || role === "OWNER"),
        ),
    );
</script>

<div class="flex flex-col gap-4 pt-2">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only vineyard workers and the organisation owner can access field work modules.
        </p>
    {:else}
        <SectionTabs {tabs} currentPath={page.url.pathname} ariaLabel="Field work navigation" />
        {@render children()}
    {/if}
</div>

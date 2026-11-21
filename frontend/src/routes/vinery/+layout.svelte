<script lang="ts">
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import SectionTabs from "$lib/components/sectionTabs/sectionTabs.svelte";
    import { session } from "$lib/stores/session.svelte";

    let { children }: { children: Snippet } = $props();

    const tabs = [
        { label: "Overview", href: "/vinery", exact: true },
        { label: "Must", href: "/vinery/must" },
        { label: "Fermenting must", href: "/vinery/fermenting" },
        { label: "Aged wine", href: "/vinery/aged" },
        { label: "Blended wine", href: "/vinery/blended" },
        { label: "Ingredients", href: "/vinery/ingredients" },
    ];

    const canAccess = $derived(
        Boolean(
            session.user?.roles.some((role) => role === "OENOLOGIST" || role === "OWNER"),
        ),
    );
</script>

<div class="flex flex-col gap-4 pt-2">
    {#if !canAccess}
        <p class="text-sm text-zinc-700">
            Only oenologists and the organisation owner can access winery production modules.
        </p>
    {:else}
        <SectionTabs {tabs} currentPath={page.url.pathname} ariaLabel="Winery navigation" />
        {@render children()}
    {/if}
</div>

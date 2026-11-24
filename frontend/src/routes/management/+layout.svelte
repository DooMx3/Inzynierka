<script lang="ts">
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import SectionTabs from "$lib/components/sectionTabs/sectionTabs.svelte";
    import { session } from "$lib/stores/session.svelte";

    let { children }: { children: Snippet } = $props();

    const tabs = [
        { label: "Equipment", href: "/management/equipment" },
        { label: "Fields", href: "/management/fields" },
        { label: "Substances", href: "/management/substances" },
        { label: "Offerings", href: "/management/offerings" },
        { label: "QR Codes", href: "/management/qr-codes" },
    ];

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);
</script>

<div class="flex flex-col gap-4 pt-2">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">
            Only the organisation owner can access vineyard and winery catalogues.
        </p>
    {:else}
        <SectionTabs {tabs} currentPath={page.url.pathname} ariaLabel="Management navigation" />
        {@render children()}
    {/if}
</div>

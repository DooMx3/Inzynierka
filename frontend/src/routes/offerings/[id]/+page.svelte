<script lang="ts">
    import { page } from "$app/state";
    import CustomerBottleView from "$lib/components/customerBottle/customerBottleView.svelte";

    const bottleId = $derived(
        (page.params as Record<string, string | undefined> | undefined)?.id ||
            decodeURIComponent(
                page.url.pathname.split("/").filter(Boolean).at(-1) || "",
            ),
    );
</script>

<svelte:head>
    <title>Wine Bottle Provenance · Vinery</title>
</svelte:head>

<div class="h-full overflow-y-auto px-4 py-5 sm:px-8">
    {#key bottleId}
        <CustomerBottleView {bottleId} />
    {/key}
</div>

<script lang="ts">
    import { page } from "$app/state";
    import PublicOfferingsPanel from "$lib/components/offerings/publicOfferingsPanel.svelte";

    const organisationId = $derived(
        (page.params as Record<string, string | undefined> | undefined)?.organisationId ||
            decodeURIComponent(
                page.url.pathname.split("/").filter(Boolean).at(-1) || "",
            ),
    );
</script>

<svelte:head>
    <title>Vineyard Wine Offerings · Vinery</title>
</svelte:head>

<div class="h-full overflow-y-auto px-4 py-6 sm:px-8">
    {#key organisationId}
        <PublicOfferingsPanel {organisationId} />
    {/key}
</div>

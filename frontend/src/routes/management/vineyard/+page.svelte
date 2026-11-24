<script lang="ts">
    import SubpageTitle from "$lib/components/subpageTitle/subpageTitle.svelte";
    import VineyardSettingsPanel from "$lib/components/vineyard/vineyardSettingsPanel.svelte";
</script>

<svelte:head>
    <title>Vineyard Settings · Management</title>
</svelte:head>

<div class="flex flex-col gap-4">
    <SubpageTitle
        title="Vineyard Settings"
        subtitle="Update your vineyard details and logo or permanently remove the organisation."
    />
    <VineyardSettingsPanel />
</div>

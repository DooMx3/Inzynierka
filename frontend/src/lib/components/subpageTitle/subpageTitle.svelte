<script lang="ts">
    import { page } from "$app/state";
    import { resolveSubpageTitle } from "$lib/functions/routeLabels";

    let { text }: { text?: string } = $props();

    const location = $derived(text ?? resolveSubpageTitle(page.url.pathname));
</script>

<span class="text-zinc-500 text-3xl font-bold">{location}</span>

<script lang="ts">
    import { page } from "$app/state";
    import { resolveBreadcrumbSegments } from "$lib/functions/routeLabels";

    let { additionalCrumbs = [] }: { additionalCrumbs?: string[] } = $props();

    const crumbs = $derived(
        resolveBreadcrumbSegments(page.url.pathname, additionalCrumbs).join(" / "),
    );
</script>

<span class="text-zinc-900">{crumbs}</span>

<script lang="ts">
    import { page } from "$app/state";

    let { additionalCrumbs = [] } : { additionalCrumbs?: string[] } = $props();

    const crumbs = $derived.by(() => {
        const location = page.url.pathname
            .split("/")
            .filter((x) => x !== "")
            .concat(additionalCrumbs)
            .map((x) => x.charAt(0).toUpperCase() + x.slice(1));

        return location.join(" / ");
    });
</script>

<span class="text-zinc-900">{crumbs}</span>

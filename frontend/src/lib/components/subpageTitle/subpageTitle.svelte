<script lang="ts">
    import { page } from "$app/state";

    let { text }: { text?: string } = $props();

    const location = $derived(
        text ??
            page.url.pathname
                .split("/")
                .filter((x) => x !== "")
                .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
                .at(-1),
    );
</script>

<span class="text-zinc-500 text-3xl font-bold">{location ?? ""}</span>


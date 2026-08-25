<script lang="ts">
    import { page } from "$app/state";

    let { additionalCrumbs = [] } : { additionalCrumbs?: string[] } = $props();

    const location = page.url.pathname
        .split("/")
        .filter((x) => x !== "")
        .concat(additionalCrumbs)
        .map((x) => x.charAt(0)
        .toUpperCase() + x.slice(1));

    const crumbs = (() => {
        let text = ""
        for (let i = 0; i < location.length; i++) {
            text += location[i];
            if (i < location.length - 1) {
                text += " / ";
            }
        }
        return text;
    })();
</script>

<span class="text-zinc-400">{crumbs}</span>

<script lang="ts">
    import type { Snippet } from "svelte";

    export type BadgeTone =
        | "primary"
        | "secondary"
        | "dark"
        | "danger"
        | "success"
        | "neutral"
        | "outline";

    let {
        label,
        tone = "primary",
        icon,
    }: {
        label: string;
        tone?: BadgeTone;
        icon?: Snippet;
    } = $props();

    const toneClasses = $derived.by(() => {
        switch (tone) {
            case "secondary":
                return "bg-[#8c735c] text-white";
            case "dark":
                return "bg-[#3f2e22] text-white";
            case "danger":
                return "bg-[#8f3d32] text-white";
            case "success":
                return "bg-[#3d6b47] text-white";
            case "neutral":
                return "bg-[#e4d8cb] text-[#3f2e22]";
            case "outline":
                return "border border-[#c4b6a6] bg-white text-zinc-700";
            default:
                return "bg-[#6b4f3a] text-white";
        }
    });
</script>

<span
    class={[
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-center text-xs font-medium",
        toneClasses,
    ]}
>
    {#if icon}
        <span class="flex items-center justify-center" aria-hidden="true">{@render icon()}</span>
    {/if}
    {label}
</span>

<script lang="ts">
    let {
        class: className = "",
        onClick: onClickFunction = () => {},
        svg = "",
        text = "",
        disabled = false,
    } = $props();

    const label = $derived(String(text).replace(/<[^>]*>/g, ""));
</script>

<button
    aria-label={label || undefined}
    class={[
        className,
        "rounded-lg p-4 flex flex-col gap-3 items-center justify-center shadow-md overflow-hidden bg-[#f7f1ea]",
        "fill-zinc-800 stroke-zinc-800 text-zinc-800",
        "transition-all duration-300 ease-in-out",
        disabled
            ? "opacity-40 cursor-not-allowed grayscale"
            : "cursor-pointer hover:scale-110",
    ]}
    onclick={() => !disabled && onClickFunction()}
    {disabled}
>
    {#if svg}
        <span class="shrink-0 h-16 w-16" role="img" aria-hidden="true"
            >{@html svg}</span
        >
    {/if}

    {#if text && !disabled}
        <span
            class="overflow-hidden text-center whitespace-normal transition-all duration-300 text-sm font-semibold"
        >
            {@html text}
        </span>
    {/if}
</button>

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-full w-full;
        fill: inherit;
        stroke: inherit;
    }

    span :global(svg *) {
        fill: inherit;
        stroke: inherit;
    }
</style>

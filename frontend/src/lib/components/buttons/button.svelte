<script lang="ts">
    import chevronRightIcon from "../../assets/chevron_right.svg?raw";

    let {
        class: className = "",
        onClick: onClickFunction = () => {},
        svg = "",
        text = "",
        isMenuButton = false,
        isFolded = true,
        type = "button",
        gentle = false,
    } = $props();
</script>

<button
    {type}
    class={[
        className,
        "rounded-lg p-2 flex h-12 items-center cursor-pointer shadow-lg",
        "transition-[transform,width,gap,max-width,opacity] duration-300 ease-in-out",
        gentle ? "hover:scale-[1.02]" : "hover:scale-110",
        // Menu buttons stay w-full so they shrink/grow with the animated nav
        // (w-full ↔ w-12 does not interpolate and snaps on collapse).
        isMenuButton
            ? ["w-full overflow-hidden", isFolded ? "justify-center gap-0" : "justify-start gap-2"]
            : isFolded
              ? "w-12 justify-center gap-0 overflow-hidden"
              : "w-full gap-2 overflow-visible",
    ]}
    onclick={() => onClickFunction()}
>
    {#if svg}
        <span class="shrink-0" role="img" aria-hidden="true">{@html svg}</span>
    {/if}

    {#if text}
        <span
            class={[
                "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                isFolded ? "max-w-0 opacity-0" : isMenuButton ? "max-w-40 opacity-100" : "max-w-full opacity-100",
            ]}
        >
            {text}
        </span>
    {/if}

    {#if isMenuButton}
        <span
            class={[
                "ml-auto shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                isFolded ? "w-0 opacity-0" : "w-8 opacity-100",
            ]}
            role="img"
            aria-hidden="true"
        >
            {@html chevronRightIcon}
        </span>
    {/if}
</button>

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-8 w-8;
        fill: inherit;
        stroke: inherit;
    }
</style>

<script lang="ts">
    import chevronRightIcon from "../../assets/chevron_right.svg?raw";

    let {
        class: className = "",
        onClick: onClickFunction = () => {},
        svg = "",
        text = "",
        isMenuButton = false,
        isFolded = true,
    } = $props();
</script>

<button
    class={[
        className,
        "rounded-lg p-2 flex h-12 items-center cursor-pointer shadow-lg overflow-hidden",
        "transition-all duration-300 ease-in-out hover:scale-110",
        isFolded ? "w-12 justify-center gap-0" : "w-full gap-2",
    ]}
    onclick={() => onClickFunction()}
>
    {#if svg}
        <span class="shrink-0" role="img" aria-hidden="true">{@html svg}</span>
    {/if}

    {#if text}
        <span
            class={[
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                isFolded ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
            ]}
        >
            {text}
        </span>
    {/if}

    {#if isMenuButton}
        <span
            class={[
                "ml-auto shrink-0 overflow-hidden transition-all duration-300",
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

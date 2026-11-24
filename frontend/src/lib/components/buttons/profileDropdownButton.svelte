<script lang="ts">
    import arrow from "$lib/assets/control.svg?raw";
    import account from "$lib/assets/account.svg?raw";

    let {
        class: className = "",
        onClick: onClickFunction = () => {},
        accountName = "Profile",
        expanded = false,
    } = $props();
</script>

<button
    type="button"
    aria-expanded={expanded}
    onclick={(event) => onClickFunction(event)}
    class={[
        "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer",
        className,
    ]}
    aria-label="Profile Dropdown"
>
    <span class="flex items-center gap-1.5 sm:gap-2">
        <span class="flex items-center gap-2">
            <span
                class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-gray-600"
            >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html account}
                </svg>
            </span>
            <span class="hidden sm:inline max-w-36 truncate">{accountName}</span>
        </span>
        <span class="rotate-180 relative -top-0.5">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html arrow}
            </svg>
        </span>
    </span>
</button>

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-8 w-8;
        fill: inherit;
        stroke: inherit;
    }
</style>

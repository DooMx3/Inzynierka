<script lang="ts">
    import arrow from "$lib/assets/control.svg?raw";
    import account from "$lib/assets/account.svg?raw";

    let {
        class: className = "",
        onClick: onClickFunction = () => {},
        accountName = "Profile",
    } = $props();
</script>

<button
    onclick={() => onClickFunction()}
    class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer ${className}"
    aria-label="Profile Dropdown"
>
    <span class="flex items-center gap-2">
        <span class="flex items-center gap-2">
            <span
                class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-gray-600"
            >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    {@html account}
                </svg>
            </span>
            <span>{accountName}</span>
        </span>
        <span class="rotate-180 relative -top-0.5">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

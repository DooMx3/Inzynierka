<script lang="ts">
    import searchIcon from "../../assets/search.svg?raw";
    import controlIcon from "../../assets/control.svg?raw";
    import plusIcon from "../../assets/plus.svg?raw";

    const uid = $props.id();

    let {
        value = $bindable(""),
        placeholder = "Search",
        class: className = "",
    }: {
        value?: string;
        placeholder?: string;
        class?: string;
    } = $props();

    const inputId = `${uid}-search`;
    let inputEl: HTMLInputElement | undefined;

    const handleKeydown = (event: KeyboardEvent) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
            return;
        }

        event.preventDefault();
        inputEl?.focus();
    };
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={["flex w-full", className]}>
    <div
        class="flex items-center gap-2 h-12 w-full min-w-0 px-4 rounded-full border border-zinc-500 bg-zinc-700 text-zinc-400 fill-zinc-400 stroke-zinc-400 transition-colors duration-200 focus-within:border-zinc-400"
    >
        <span class="search-icon shrink-0" role="img" aria-hidden="true">{@html searchIcon}</span>
        <input
            id={inputId}
            bind:this={inputEl}
            type="search"
            {placeholder}
            bind:value
            class="flex-1 min-w-0 bg-transparent border-none outline-none appearance-none text-zinc-300 placeholder:text-zinc-500"
            aria-label={placeholder}
            aria-keyshortcuts="Control+K"
        />
        <kbd
            class="shortcut shrink-0 flex items-center gap-0.5 h-7 px-1.5 rounded-md border border-zinc-500 bg-zinc-800 text-zinc-400 fill-zinc-400 pointer-events-none"
            aria-hidden="true"
        >
            <span class="shortcut-icon">{@html controlIcon}</span>
            <span class="shortcut-icon">{@html plusIcon}</span>
            <span class="text-xs font-medium leading-none">K</span>
        </kbd>
    </div>
</div>

<style>
    @reference "../../../app.css";

    .search-icon :global(svg) {
        @apply h-5 w-5;
        fill: inherit;
        stroke: inherit;
    }

    .shortcut-icon :global(svg) {
        @apply h-3 w-3;
        fill: inherit;
        stroke: inherit;
    }
</style>

<script lang="ts">
    import dropDownIcon from "$lib/assets/drop_down.svg?raw";

    type OptionItem = { value: string; label: string };

    let {
        value = $bindable(""),
        placeholder = "Number",
        options = [],
        additionalIcon = "",
        svg = "",
        class: className = "",
        disabled = false,
        id = "",
        name = "",
        onchange,
    }: {
        value?: string;
        placeholder?: string;
        options?: (OptionItem | string)[];
        additionalIcon?: string;
        svg?: string;
        class?: string;
        disabled?: boolean;
        id?: string;
        name?: string;
        onchange?: (val: string) => void;
    } = $props();

    let isOpen = $state(false);
    let containerEl: HTMLDivElement | undefined = $state();

    const normalizedOptions = $derived<OptionItem[]>(
        options.map((opt) =>
            typeof opt === "string" ? { value: opt, label: opt } : opt
        )
    );

    const selectedLabel = $derived(
        normalizedOptions.find((opt) => opt.value === value)?.label ?? ""
    );

    const iconToRender = $derived(additionalIcon || svg);

    const toggleOpen = () => {
        if (!disabled) {
            isOpen = !isOpen;
        }
    };

    const selectOption = (optionValue: string) => {
        value = optionValue;
        isOpen = false;
        if (onchange) {
            onchange(optionValue);
        }
    };

    const handleWindowClick = (event: MouseEvent) => {
        if (containerEl && !containerEl.contains(event.target as Node)) {
            isOpen = false;
        }
    };

    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            isOpen = false;
        }
    };
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div
    bind:this={containerEl}
    class={[
        "dropdown-container relative inline-block select-none",
        className,
    ]}
>
    <input type="hidden" {name} {value} />

    <button
        type="button"
        {id}
        {disabled}
        onclick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        class={[
            "flex items-center gap-2.5 h-10 px-3.5 w-36 rounded-xl bg-white text-zinc-700 border border-[#c4b6a6] hover:border-[#8c735c] transition-colors duration-150 text-left",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            isOpen ? "border-[#6b4f3a] ring-1 ring-[#6b4f3a]/30" : "",
        ]}
    >
        {#if iconToRender}
            <span
                class="additional-icon shrink-0 flex items-center justify-center text-[#6b4f3a]"
                role="img"
                aria-hidden="true"
            >
                {@html iconToRender}
            </span>
        {/if}

        <span
            class={[
                "dropdown-label flex-1 text-sm font-medium truncate",
                selectedLabel ? "text-zinc-800" : "text-zinc-500",
            ]}
        >
            {selectedLabel || placeholder}
        </span>

        <span
            class={[
                "dropdown-arrow shrink-0 flex items-center justify-center text-[#6b4f3a] transition-transform duration-200",
                isOpen ? "rotate-180" : "",
            ]}
            role="img"
            aria-hidden="true"
        >
            {@html dropDownIcon}
        </span>
    </button>

    {#if isOpen}
        <div
            class="options-menu absolute left-0 top-full mt-1.5 w-full min-w-full z-50 rounded-xl bg-[#f7f1ea] border border-[#d9cbbd] shadow-lg p-1 max-h-60 overflow-y-auto"
            role="listbox"
            tabindex="-1"
        >
            {#each normalizedOptions as opt (opt.value)}
                <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onclick={() => selectOption(opt.value)}
                    class={[
                        "w-full text-left px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors duration-100 flex items-center justify-between",
                        opt.value === value
                            ? "bg-[#e4d8cb] text-zinc-900 font-medium"
                            : "text-zinc-700 hover:bg-[#efe6dc] hover:text-zinc-900",
                    ]}
                >
                    <span class="truncate">{opt.label}</span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    @reference "../../../app.css";

    .additional-icon :global(svg) {
        @apply h-5 w-5;
        fill: currentColor;
    }

    .dropdown-arrow :global(svg) {
        @apply h-4 w-4;
        fill: currentColor;
    }
</style>

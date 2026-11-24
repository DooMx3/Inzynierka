<script lang="ts">
    import type { Snippet } from "svelte";
    import type { Attachment } from "svelte/attachments";

    const INTERACTIVE_SELECTOR =
        'button, a, input, select, textarea, label, [role="button"]';

    let {
        index = 0,
        selectable = false,
        selected = false,
        selectLabel = "Select row",
        onToggleSelect = () => {},
        expanded = $bindable(false),
        expandLabel = "Toggle row details",
        colspan = 99,
        highlighted = false,
        rowId,
        expandOnRowClick = false,
        autoScrollWhenHighlighted = false,
        cells,
        actions,
        details,
    }: {
        index?: number;
        selectable?: boolean;
        selected?: boolean;
        selectLabel?: string;
        onToggleSelect?: () => void;
        expanded?: boolean;
        expandLabel?: string;
        colspan?: number;
        highlighted?: boolean;
        rowId?: string;
        expandOnRowClick?: boolean;
        autoScrollWhenHighlighted?: boolean;
        cells: Snippet;
        actions?: Snippet;
        details?: Snippet;
    } = $props();

    const isExpandable = $derived(Boolean(details));
    const isRowClickExpandable = $derived(expandOnRowClick && isExpandable);

    const toggleExpand = () => {
        if (isExpandable) {
            expanded = !expanded;
        }
    };

    const handleRowClick = (event: MouseEvent) => {
        if (!isRowClickExpandable) return;
        const target = event.target as Element | null;
        const element =
            target && typeof target.closest === "function"
                ? target
                : (event.target as Node | null)?.parentElement ?? null;
        if (element?.closest(INTERACTIVE_SELECTOR)) {
            return;
        }
        toggleExpand();
    };

    const scrollIntoViewAttachment: Attachment<HTMLTableRowElement> = (node) => {
        node.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    };
</script>

<tr
    id={rowId}
    data-highlighted={highlighted ? "true" : undefined}
    onclick={isRowClickExpandable ? handleRowClick : undefined}
    {@attach autoScrollWhenHighlighted && highlighted
        ? scrollIntoViewAttachment
        : undefined}
    class={[
        "border-t border-[#e4d8cb] transition-colors",
        isRowClickExpandable && "cursor-pointer",
        highlighted
            ? "bg-[#e9dccb] ring-2 ring-inset ring-[#6b4f3a]"
            : index % 2 === 1
              ? "bg-[#efe6dc]"
              : "bg-transparent",
    ]}
>
    {#if selectable}
        <td class="w-10 px-4 py-3">
            <input
                type="checkbox"
                checked={selected}
                aria-label={selectLabel}
                class="accent-[#6b4f3a]"
                onchange={() => onToggleSelect()}
            />
        </td>
    {/if}

    {@render cells()}

    {#if actions || isExpandable}
        <td class="px-4 py-3">
            <div class="flex items-center justify-end gap-2">
                {#if actions}
                    {@render actions()}
                {/if}
                {#if isExpandable}
                    <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={expandLabel}
                        onclick={toggleExpand}
                        class={[
                            "expand-btn flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#d9cbbd] bg-[#fbf7f2] text-[#6b4f3a] transition-colors hover:bg-[#e4d8cb] hover:text-[#3f2e22]",
                            expanded && "bg-[#e4d8cb] text-[#3f2e22]",
                        ]}
                    >
                        <span
                            class={[
                                "chevron flex items-center justify-center transition-transform duration-200",
                                expanded && "rotate-180",
                            ]}
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                class="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </span>
                    </button>
                {/if}
            </div>
        </td>
    {/if}
</tr>

{#if isExpandable && expanded && details}
    <tr class="border-t border-[#e4d8cb] bg-[#fbf7f2]">
        <td {colspan} class="px-6 py-4">
            {@render details()}
        </td>
    </tr>
{/if}

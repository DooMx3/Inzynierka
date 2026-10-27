<script lang="ts" generics="T extends { id: string }">
    import type { Snippet } from "svelte";

    let {
        rows,
        head,
        row,
        pageSize = 8,
        emptyLabel = "No results",
    }: {
        rows: T[];
        head: Snippet;
        row: Snippet<[T]>;
        pageSize?: number;
        emptyLabel?: string;
    } = $props();

    let page = $state(1);

    const pageCount = $derived(Math.max(1, Math.ceil(rows.length / pageSize)));
    const currentPage = $derived(Math.min(page, pageCount));
    const visible = $derived(
        rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    );
    const pages = $derived(Array.from({ length: pageCount }, (_, index) => index + 1));

    const goTo = (next: number) => {
        page = Math.min(Math.max(1, next), pageCount);
    };
</script>

<section class="overflow-hidden rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] text-zinc-800 shadow-sm" aria-label="Results">
    <header class="flex items-center justify-between gap-3 border-b border-[#e4d8cb] px-4 py-3">
        <h2 class="text-lg font-semibold">Results</h2>
        <nav class="flex items-center gap-1" aria-label="Pagination">
            <button
                type="button"
                class="page-btn"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onclick={() => goTo(currentPage - 1)}
            >
                ‹
            </button>
            {#each pages as number (number)}
                <button
                    type="button"
                    class={["page-btn", number === currentPage && "bg-[#6b4f3a] text-white"]}
                    aria-current={number === currentPage ? "page" : undefined}
                    onclick={() => goTo(number)}
                >
                    {number}
                </button>
            {/each}
            <button
                type="button"
                class="page-btn"
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onclick={() => goTo(currentPage + 1)}
            >
                ›
            </button>
        </nav>
    </header>

    <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
            <thead class="bg-[#e4d8cb] text-[#3f2e22]">
                <tr>
                    {@render head()}
                </tr>
            </thead>
            <tbody>
                {#if visible.length === 0}
                    <tr>
                        <td class="px-4 py-8 text-center text-zinc-500" colspan="99">{emptyLabel}</td>
                    </tr>
                {:else}
                    {#each visible as item (item.id)}
                        {@render row(item)}
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</section>

<style>
    @reference "../../../../app.css";

    .page-btn {
        @apply grid h-8 min-w-8 cursor-pointer place-items-center rounded-md px-2 text-zinc-700 hover:bg-[#e4d8cb] disabled:cursor-not-allowed disabled:opacity-40;
    }

    thead :global(th) {
        @apply text-sm font-bold text-[#3f2e22];
    }
</style>

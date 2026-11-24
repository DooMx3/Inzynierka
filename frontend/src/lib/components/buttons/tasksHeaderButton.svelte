<script lang="ts">
    import { page } from "$app/state";
    import taskIcon from "$lib/assets/task.svg?raw";

    let { class: className = "" }: { class?: string } = $props();

    const isActive = $derived(page.url.pathname.startsWith("/tasks"));
</script>

<button
    type="button"
    aria-label="Tasks"
    aria-current={isActive ? "page" : undefined}
    onclick={() => (window.location.href = "/tasks")}
    class={[
        "tasks-header-btn flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        isActive
            ? "border-[#6b4f3a] bg-[#6b4f3a] text-white hover:bg-[#5a4230]"
            : "border-[#d9cbbd] bg-[#f7f1ea] text-[#3f2e22] hover:bg-[#e4d3c0]",
        className,
    ]}
>
    <span class="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html taskIcon}
    </span>
    <span class="hidden sm:inline">Tasks</span>
</button>

<style>
    .tasks-header-btn :global(svg) {
        height: 1.25rem;
        width: 1.25rem;
        fill: currentColor;
    }
</style>

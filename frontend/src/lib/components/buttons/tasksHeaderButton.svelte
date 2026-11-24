<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import taskIcon from "$lib/assets/task.svg?raw";
    import { getTasks, TASKS_CHANGED_EVENT } from "$lib/api/tasks";

    let { class: className = "" }: { class?: string } = $props();

    let plannedCount = $state(0);

    const isActive = $derived(page.url.pathname.startsWith("/tasks"));

    const loadPlannedCount = async () => {
        try {
            const tasks = await getTasks({ status: "PLANNED" });
            plannedCount = tasks.filter((task) => !task.completed).length;
        } catch {
            plannedCount = 0;
        }
    };

    onMount(() => {
        void loadPlannedCount();

        const handleTasksChanged = () => {
            void loadPlannedCount();
        };

        window.addEventListener(TASKS_CHANGED_EVENT, handleTasksChanged);
        return () => {
            window.removeEventListener(TASKS_CHANGED_EVENT, handleTasksChanged);
        };
    });
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
    {#if plannedCount > 0}
        <span
            data-testid="tasks-planned-badge"
            class={[
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                isActive
                    ? "bg-white text-[#6b4f3a]"
                    : "bg-[#6b4f3a] text-white",
            ]}
        >
            {plannedCount > 99 ? "99+" : plannedCount}
        </span>
    {/if}
</button>

<style>
    .tasks-header-btn :global(svg) {
        height: 1.25rem;
        width: 1.25rem;
        fill: currentColor;
    }
</style>

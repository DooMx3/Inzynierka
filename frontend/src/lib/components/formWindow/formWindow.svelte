<script lang="ts">
    import type { Snippet } from "svelte";
    import closeIcon from "$lib/assets/close.svg?raw";
    import Breadcrumbs from "$lib/components/breadcrumbs/breadcrumbs.svelte";
    import SubpageTitle from "$lib/components/subpageTitle/subpageTitle.svelte";
    import AcceptButton from "$lib/components/buttons/acceptButton.svelte";
    import CancelButton from "$lib/components/buttons/cancelButton.svelte";

    let {
        children,
        title = "",
        additionalCrumbs = [],
        showBreadcrumbs = true,
        onClose = () => {},
        onCancel = () => {},
        onAccept = () => {},
        acceptText = "Confirm",
        cancelText = "Cancel",
        class: className = "",
    }: {
        children?: Snippet;
        title?: string;
        additionalCrumbs?: string[];
        showBreadcrumbs?: boolean;
        onClose?: () => void;
        onCancel?: () => void;
        onAccept?: () => void;
        acceptText?: string;
        cancelText?: string;
        class?: string;
    } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div
        class={[
            "relative flex flex-col w-full max-w-2xl min-h-[380px] rounded-2xl bg-zinc-900 border border-zinc-700/80 p-6 shadow-2xl",
            className,
        ]}
    >
        <div class="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div class="flex flex-col items-start gap-1">
                {#if showBreadcrumbs}
                    <Breadcrumbs {additionalCrumbs} />
                {/if}
                <SubpageTitle text={title} />
            </div>

            <button
                type="button"
                aria-label="Close"
                onclick={() => onClose()}
                class="close-btn shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
                <span class="h-5 w-5 fill-current stroke-current" role="img" aria-hidden="true">
                    {@html closeIcon}
                </span>
            </button>
        </div>

        <div class="my-6 flex-1 min-h-0 overflow-y-auto">
            {#if children}
                {@render children()}
            {/if}
        </div>

        <div class="mt-auto ml-auto flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 w-1/2">
            <CancelButton onClick={() => onCancel()} text={cancelText} />
            <AcceptButton onClick={() => onAccept()} text={acceptText} />
        </div>
    </div>
</div>

<style>
    @reference "../../../app.css";

    .close-btn :global(svg) {
        @apply h-full w-full;
        fill: currentColor;
    }
</style>

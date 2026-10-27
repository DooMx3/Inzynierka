<script lang="ts">
    import type { Snippet } from "svelte";
    import closeIcon from "$lib/assets/close.svg?raw";
    import checkIcon from "$lib/assets/check.svg?raw";
    import Breadcrumbs from "$lib/components/breadcrumbs/breadcrumbs.svelte";
    import SubpageTitle from "$lib/components/subpageTitle/subpageTitle.svelte";
    import AcceptButton from "$lib/components/buttons/acceptButton.svelte";
    import CancelButton from "$lib/components/buttons/cancelButton.svelte";
    import GlassBlur from "$lib/components/glassBlur/glassBlur.svelte";

    let {
        children,
        title = "",
        additionalCrumbs = [],
        showBreadcrumbs = true,
        showActions = true,
        onClose = () => {},
        onCancel = () => {},
        onAccept = () => {},
        acceptText = "Confirm",
        cancelText = "Cancel",
        acceptIcon = checkIcon,
        wide = false,
        class: className = "",
    }: {
        children?: Snippet;
        title?: string;
        additionalCrumbs?: string[];
        showBreadcrumbs?: boolean;
        showActions?: boolean;
        onClose?: () => void;
        onCancel?: () => void;
        onAccept?: () => void;
        acceptText?: string;
        cancelText?: string;
        acceptIcon?: string;
        wide?: boolean;
        class?: string;
    } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <GlassBlur id="form-glass" />
    <div
        class={[
            "relative z-50 flex w-full flex-col rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-lg",
            wide ? "max-w-4xl" : "max-w-2xl",
            className,
        ]}
    >
        <div class="flex items-start justify-between gap-4 border-b border-[#e4d8cb] pb-4">
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
                class="close-btn flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#6b4f3a] transition-colors hover:bg-[#e4d8cb] hover:text-[#3f2e22]"
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

        {#if showActions}
            <div class="mt-auto border-t border-[#e4d8cb] pt-4">
                <div class="ml-auto flex w-1/2 items-center justify-end gap-3">
                    <CancelButton onClick={() => onCancel()} text={cancelText} />
                    <AcceptButton onClick={() => onAccept()} text={acceptText} svg={acceptIcon} />
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    @reference "../../../app.css";

    .close-btn :global(svg) {
        @apply h-full w-full;
        fill: currentColor;
    }
</style>

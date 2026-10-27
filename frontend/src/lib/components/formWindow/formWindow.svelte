<script lang="ts">
    import type { Snippet } from "svelte";
    import closeIcon from "$lib/assets/close.svg?raw";
    import checkIcon from "$lib/assets/check.svg?raw";
    import Breadcrumbs from "$lib/components/breadcrumbs/breadcrumbs.svelte";
    import SubpageTitle from "$lib/components/subpageTitle/subpageTitle.svelte";
    import AcceptButton from "$lib/components/buttons/acceptButton.svelte";
    import CancelButton from "$lib/components/buttons/cancelButton.svelte";
    import GlassBlur from "$lib/components/glassBlur/glassBlur.svelte";

    const COUNTDOWN_RADIUS = 15.5;
    const COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RADIUS;

    let {
        children,
        title = "",
        additionalCrumbs = [],
        showBreadcrumbs = true,
        showActions = true,
        showCancel = true,
        onClose = () => {},
        onCancel = () => {},
        onAccept = () => {},
        acceptText = "Confirm",
        cancelText = "Cancel",
        acceptIcon = checkIcon,
        wide = false,
        closeCountdownSeconds = null as number | null,
        class: className = "",
    }: {
        children?: Snippet;
        title?: string;
        additionalCrumbs?: string[];
        showBreadcrumbs?: boolean;
        showActions?: boolean;
        showCancel?: boolean;
        onClose?: () => void;
        onCancel?: () => void;
        onAccept?: () => void;
        acceptText?: string;
        cancelText?: string;
        acceptIcon?: string;
        wide?: boolean;
        closeCountdownSeconds?: number | null;
        class?: string;
    } = $props();

    let remainingSeconds = $state(
        closeCountdownSeconds != null && closeCountdownSeconds > 0 ? closeCountdownSeconds : 0,
    );
    let countdownProgress = $derived(
        closeCountdownSeconds && closeCountdownSeconds > 0
            ? remainingSeconds / closeCountdownSeconds
            : 0,
    );

    // Timer + circular progress for auto-close; $effect is the right tool for intervals.
    $effect(() => {
        const total = closeCountdownSeconds;
        if (total == null || total <= 0) {
            return;
        }

        remainingSeconds = total;
        const interval = setInterval(() => {
            if (remainingSeconds <= 1) {
                clearInterval(interval);
                remainingSeconds = 0;
                onClose();
                return;
            }
            remainingSeconds -= 1;
        }, 1000);

        return () => clearInterval(interval);
    });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <GlassBlur id="form-glass" />
    <div
        class={[
            "relative z-50 flex w-full flex-col overflow-visible rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-lg",
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

            {#if closeCountdownSeconds != null && closeCountdownSeconds > 0}
                <button
                    type="button"
                    aria-label="Log out in {remainingSeconds} seconds"
                    onclick={() => onClose()}
                    class="countdown-btn relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6b4f3a]"
                >
                    <svg class="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                        <circle
                            cx="18"
                            cy="18"
                            r={COUNTDOWN_RADIUS}
                            fill="none"
                            stroke="#e4d8cb"
                            stroke-width="3"
                        />
                        <circle
                            cx="18"
                            cy="18"
                            r={COUNTDOWN_RADIUS}
                            fill="none"
                            stroke="#6b4f3a"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-dasharray={COUNTDOWN_CIRCUMFERENCE}
                            stroke-dashoffset={COUNTDOWN_CIRCUMFERENCE * (1 - countdownProgress)}
                            class="countdown-ring"
                        />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
                        {remainingSeconds}
                    </span>
                </button>
            {:else}
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
            {/if}
        </div>

        <div class="my-6 min-h-0 flex-1 overflow-y-auto px-3">
            {#if children}
                {@render children()}
            {/if}
        </div>

        {#if showActions}
            <div class="mt-auto border-t border-[#e4d8cb] pt-4">
                <div
                    class={[
                        "ml-auto flex items-center justify-end gap-4 p-2",
                        showCancel ? "w-[calc(50%+0.5rem)]" : "w-full max-w-xs",
                    ]}
                >
                    {#if showCancel}
                        <CancelButton onClick={() => onCancel()} text={cancelText} />
                    {/if}
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

    .countdown-ring {
        transition: stroke-dashoffset 1s linear;
    }
</style>

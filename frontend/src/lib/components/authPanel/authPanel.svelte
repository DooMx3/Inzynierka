<script lang="ts">
    import { tick } from "svelte";
    import type { Attachment } from "svelte/attachments";
    import { authSlide } from "$lib/functions/authSlide";
    import ForgotPasswordForm from "../forgotPasswordForm/forgotPasswordForm.svelte";
    import LoginForm from "../loginForm/loginForm.svelte";
    import RegisterForm from "../registerForm/registerForm.svelte";

    let { animate = true }: { animate?: boolean } = $props();

    let mode = $state<"login" | "register">("login");
    let motion = $state(false);
    let showingForgotPassword = $state(false);
    let flipCard = $state<HTMLElement | null>(null);
    let frontHeight = $state(0);
    let backHeight = $state(0);

    let cardSized = $derived(frontHeight > 0 && backHeight > 0);
    let cardHeight = $derived(showingForgotPassword ? backHeight : frontHeight);

    const rememberCard: Attachment = (node) => {
        flipCard = node;
        return () => {
            flipCard = null;
        };
    };

    const showLogin = () => {
        motion = true;
        mode = "login";
    };

    const showRegister = () => {
        motion = true;
        showingForgotPassword = false;
        mode = "register";
    };

    const focusRevealedFace = () => {
        const face = showingForgotPassword ? "back" : "front";
        flipCard
            ?.querySelector<HTMLElement>(`[data-face="${face}"] input, [data-face="${face}"] button`)
            ?.focus();
    };

    const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showForgotPassword = async () => {
        showingForgotPassword = true;
        if (prefersReducedMotion()) {
            await tick();
            focusRevealedFace();
        }
    };

    const hideForgotPassword = async () => {
        showingForgotPassword = false;
        if (prefersReducedMotion()) {
            await tick();
            focusRevealedFace();
        }
    };

    const onFlipEnd = (event: TransitionEvent) => {
        if (event.target !== event.currentTarget || event.propertyName !== "transform") {
            return;
        }
        focusRevealedFace();
    };
</script>

<div class="relative h-full min-h-full w-full overflow-hidden" data-mode={mode}>
    {#if mode === "login"}
        <div
            class="absolute inset-0 flex items-center justify-center overflow-y-auto p-8"
            in:authSlide={{ panel: "login", phase: "in", animate: animate && motion }}
            out:authSlide={{ panel: "login", phase: "out", animate: animate && motion }}
        >
            <div class="flip-scene w-full max-w-md">
                <div
                    class={["flip-card", cardSized && "is-ready", showingForgotPassword && "is-flipped"]}
                    style:height={cardSized ? `${cardHeight}px` : undefined}
                    data-flipped={showingForgotPassword}
                    {@attach rememberCard}
                    ontransitionend={onFlipEnd}
                >
                    <div
                        class="flip-face"
                        data-face="front"
                        inert={showingForgotPassword}
                        bind:clientHeight={frontHeight}
                    >
                        <LoginForm
                            onSwitchToRegister={showRegister}
                            onForgotPassword={showForgotPassword}
                        />
                    </div>
                    <div
                        class="flip-face flip-back"
                        data-face="back"
                        inert={!showingForgotPassword}
                        bind:clientHeight={backHeight}
                    >
                        <ForgotPasswordForm onBackToSignIn={hideForgotPassword} />
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div
            class="absolute inset-0 flex items-center justify-center overflow-y-auto p-8"
            in:authSlide={{ panel: "register", phase: "in", animate: animate && motion }}
            out:authSlide={{ panel: "register", phase: "out", animate: animate && motion }}
        >
            <div class="w-full max-w-md">
                <RegisterForm onSwitchToLogin={showLogin} />
            </div>
        </div>
    {/if}
</div>

<style>
    .flip-scene {
        perspective: 1200px;
    }

    .flip-card {
        position: relative;
        transform-style: preserve-3d;
        transition: transform 700ms cubic-bezier(0.45, 0.05, 0.55, 0.95);
    }

    .flip-card.is-ready {
        transition:
            transform 700ms cubic-bezier(0.45, 0.05, 0.55, 0.95),
            height 700ms cubic-bezier(0.45, 0.05, 0.55, 0.95);
    }

    .flip-card.is-flipped {
        transform: rotateY(180deg);
    }

    .flip-face {
        transform: translateZ(1px);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }

    .flip-back,
    .flip-card.is-ready .flip-face {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
    }

    .flip-back {
        transform: rotateY(180deg) translateZ(1px);
    }

    @media (prefers-reduced-motion: reduce) {
        .flip-card,
        .flip-card.is-ready {
            transition-duration: 1ms;
        }
    }
</style>

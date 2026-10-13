<script lang="ts">
    import { authSlide } from "$lib/functions/authSlide";
    import LoginForm from "../loginForm/loginForm.svelte";
    import RegisterForm from "../registerForm/registerForm.svelte";

    let { animate = true }: { animate?: boolean } = $props();

    let mode = $state<"login" | "register">("login");
    let motion = $state(false);

    const showLogin = () => {
        motion = true;
        mode = "login";
    };

    const showRegister = () => {
        motion = true;
        mode = "register";
    };
</script>

<div class="relative h-full min-h-full w-full overflow-hidden" data-mode={mode}>
    {#if mode === "login"}
        <div
            class="absolute inset-0 flex items-center justify-center overflow-y-auto p-8"
            in:authSlide={{ panel: "login", phase: "in", animate: animate && motion }}
            out:authSlide={{ panel: "login", phase: "out", animate: animate && motion }}
        >
            <div class="w-full max-w-md">
                <LoginForm onSwitchToRegister={showRegister} />
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

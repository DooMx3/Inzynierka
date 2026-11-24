<script lang="ts">
    import mailIcon from "$lib/assets/mail.svg?raw";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { login } from "$lib/api/auth";
    import { loginErrorMessages, loginInvalidFields } from "$lib/functions/authFormValidation";
    import { setUser } from "$lib/stores/session.svelte";
    import { gooeyToast } from "goey-toast-svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import LoginButton from "../buttons/loginButton.svelte";
    import AuthSwitch from "../authSwitch/authSwitch.svelte";

    let {
        onSwitchToRegister = () => {},
        onForgotPassword = () => {},
    }: {
        onSwitchToRegister?: () => void;
        onForgotPassword?: () => void;
    } = $props();

    let email = $state("");
    let password = $state("");
    let showErrors = $state(false);
    let authFailed = $state(false);
    let pending = $state(false);

    let fieldErrors = $derived(loginInvalidFields(email, password));
    let emailInvalid = $derived((showErrors && fieldErrors.email) || authFailed);
    let passwordInvalid = $derived((showErrors && fieldErrors.password) || authFailed);

    const clearAuthFailed = () => {
        authFailed = false;
    };

    const getSafeRedirectTarget = (): string => {
        try {
            const redirectTo = new URL(window.location.href, "http://localhost").searchParams.get("redirectTo");
            if (
                redirectTo &&
                redirectTo.startsWith("/") &&
                !redirectTo.startsWith("//") &&
                !redirectTo.startsWith("/auth")
            ) {
                return redirectTo;
            }
        } catch {
            // Fall back to home when window.location.href cannot be parsed
        }
        return "/";
    };

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        showErrors = true;
        authFailed = false;
        gooeyToast.dismiss({ type: ["error", "warning"] });
        const messages = loginErrorMessages(email, password);
        if (messages.length > 0) {
            gooeyToast.warning("Check your credentials", {
                description: messages.join(" "),
            });
            return;
        }

        pending = true;
        try {
            const user = await login(email.trim(), password);
            setUser(user);
            gooeyToast.success("Signed in", {
                description: "Welcome back!",
            });
            window.location.href = getSafeRedirectTarget();
        } catch (error) {
            authFailed = true;
            gooeyToast.error("Login failed", {
                description: error instanceof Error ? error.message : "Could not sign in.",
            });
        } finally {
            pending = false;
        }
    };
</script>

<form class="flex w-full flex-col gap-4 rounded-3xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-sm" novalidate onsubmit={submit}>
    <h2 class="text-xl font-semibold">Welcome back.</h2>
    <hr class="border-[#d9cbbd]" />
    <InputField
        label="Email"
        type="email"
        placeholder="Please enter your email"
        bind:value={email}
        svg={mailIcon}
        invalid={emailInvalid}
        oninput={clearAuthFailed}
    />
    <InputField
        label="Password"
        type="password"
        placeholder="Please enter your password"
        bind:value={password}
        svg={passwordIcon}
        invalid={passwordInvalid}
        oninput={clearAuthFailed}
    />
    <button
        type="button"
        class="cursor-pointer self-end border-0 bg-transparent p-0 text-sm font-semibold text-[#6b4f3a] transition-colors duration-200 hover:text-[#3d2a1c]"
        onclick={onForgotPassword}
    >
        Forgot password?
    </button>
    <hr class="border-[#d9cbbd]" />
    <LoginButton type="submit" />
    <AuthSwitch prefix="You want to" keyword="create an account" onClick={onSwitchToRegister} />
</form>

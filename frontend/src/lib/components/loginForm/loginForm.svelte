<script lang="ts">
    import mailIcon from "$lib/assets/mail.svg?raw";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { login } from "$lib/api/auth";
    import { loginErrorMessages, loginInvalidFields } from "$lib/functions/authFormValidation";
    import { setUser } from "$lib/stores/session.svelte";
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

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        showErrors = true;
        authFailed = false;
        const messages = loginErrorMessages(email, password);
        if (messages.length > 0) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            const user = await login(email.trim(), password);
            setUser(user);
            window.location.href = "/";
        } catch (error) {
            authFailed = true;
            alert(error instanceof Error ? error.message : "Login failed");
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

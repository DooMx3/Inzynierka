<script lang="ts">
    import personIcon from "$lib/assets/person.svg?raw";
    import mailIcon from "$lib/assets/mail.svg?raw";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { register } from "$lib/api/auth";
    import {
        registerErrorMessages,
        registerInvalidFields,
    } from "$lib/functions/authFormValidation";
    import { setUser } from "$lib/stores/session.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import PasswordStrengthIndicator from "../passwordUtilities/passwordStrengthIndicator.svelte";
    import PasswordConditionsIndicator from "../passwordUtilities/passwordConditionsIndicator.svelte";
    import CreateAccountButton from "../buttons/createAccountButton.svelte";
    import AuthSwitch from "../authSwitch/authSwitch.svelte";

    let {
        onSwitchToLogin = () => {},
    }: {
        onSwitchToLogin?: () => void;
    } = $props();

    let username = $state("");
    let lastname = $state("");
    let email = $state("");
    let password = $state("");
    let confirmPassword = $state("");
    let passwordValid = $state(false);
    let showErrors = $state(false);
    let pending = $state(false);

    let fieldErrors = $derived(
        registerInvalidFields({
            username,
            lastname,
            email,
            password,
            confirmPassword,
        }),
    );

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        showErrors = true;
        const messages = registerErrorMessages({
            username,
            lastname,
            email,
            password,
            confirmPassword,
        });
        if (
            !passwordValid &&
            !messages.includes("Password does not meet the requirements.")
        ) {
            messages.unshift("Password does not meet the requirements.");
        }
        if (messages.length > 0 || !passwordValid) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            const user = await register(
                username.trim(),
                email.trim(),
                password,
            );
            setUser(user);
            window.location.href = "/";
        } catch (error) {
            alert(
                error instanceof Error ? error.message : "Registration failed",
            );
        } finally {
            pending = false;
        }
    };
</script>

<form
    class="flex w-full flex-col gap-4 rounded-3xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-sm"
    novalidate
    onsubmit={submit}
>
    <h2 class="text-xl font-semibold">
        Welcome aboard. Please create an account to continue.
    </h2>
    <hr class="border-[#d9cbbd]" />
    <InputField
        label="Firstname"
        placeholder="Please enter your firstname"
        bind:value={username}
        svg={personIcon}
        invalid={showErrors && fieldErrors.username}
    />
    <InputField
        label="Lastname"
        placeholder="Please enter your lastname"
        bind:value={lastname}
        svg={personIcon}
        invalid={showErrors && fieldErrors.lastname}
    />
    <InputField
        label="Email"
        type="email"
        placeholder="Please enter your email"
        bind:value={email}
        svg={mailIcon}
        invalid={showErrors && fieldErrors.email}
    />
    <InputField
        label="Password"
        type="password"
        placeholder="Please enter your password"
        bind:value={password}
        svg={passwordIcon}
        invalid={showErrors && !passwordValid}
    />
    <PasswordStrengthIndicator
        {password}
        userInput={[username, lastname, email]}
    />
    <InputField
        label="Confirm Password"
        type="password"
        placeholder="Please confirm your password"
        bind:value={confirmPassword}
        svg={passwordIcon}
        invalid={showErrors && fieldErrors.confirmPassword}
    />
    <PasswordConditionsIndicator {password} bind:valid={passwordValid} />
    <hr class="border-[#d9cbbd]" />
    <CreateAccountButton type="submit" />
    <AuthSwitch
        prefix="You want to"
        keyword="sign in"
        onClick={onSwitchToLogin}
    />
</form>

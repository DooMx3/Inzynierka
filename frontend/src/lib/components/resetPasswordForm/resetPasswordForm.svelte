<script lang="ts">
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { resetPassword } from "$lib/api/auth";
    import {
        resetPasswordErrorMessages,
        resetPasswordInvalidFields,
    } from "$lib/functions/authFormValidation";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import PasswordStrengthIndicator from "../passwordUtilities/passwordStrengthIndicator.svelte";
    import PasswordConditionsIndicator from "../passwordUtilities/passwordConditionsIndicator.svelte";
    import ResetPasswordButton from "../buttons/resetPasswordButton.svelte";
    import AuthSwitch from "../authSwitch/authSwitch.svelte";

    let { token = "" }: { token?: string } = $props();

    let password = $state("");
    let confirmPassword = $state("");
    let passwordValid = $state(false);
    let showErrors = $state(false);
    let pending = $state(false);
    let doneMessage = $state("");

    let fieldErrors = $derived(resetPasswordInvalidFields({ password, confirmPassword }));
    let tokenMissing = $derived(token.trim().length === 0);

    const backToSignIn = () => {
        window.location.href = "/auth";
    };

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending || tokenMissing) {
            return;
        }

        showErrors = true;
        const messages = resetPasswordErrorMessages({ password, confirmPassword });
        if (!passwordValid && !messages.includes("Password does not meet the requirements.")) {
            messages.unshift("Password does not meet the requirements.");
        }
        if (messages.length > 0 || !passwordValid) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            doneMessage = await resetPassword(token.trim(), password);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Password reset failed");
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
    <h2 class="text-xl font-semibold">Choose a new password.</h2>
    <hr class="border-[#d9cbbd]" />
    {#if tokenMissing}
        <p class="text-sm text-zinc-700">This reset link is missing a token.</p>
    {:else if doneMessage}
        <p class="text-sm text-zinc-700">{doneMessage}</p>
    {:else}
        <InputField
            label="New password"
            type="password"
            placeholder="Please enter your new password"
            bind:value={password}
            svg={passwordIcon}
            invalid={showErrors && !passwordValid}
        />
        <PasswordStrengthIndicator {password} userInput={[]} />
        <InputField
            label="Confirm password"
            type="password"
            placeholder="Please confirm your new password"
            bind:value={confirmPassword}
            svg={passwordIcon}
            invalid={showErrors && fieldErrors.confirmPassword}
        />
        <PasswordConditionsIndicator {password} bind:valid={passwordValid} />
        <hr class="border-[#d9cbbd]" />
        <ResetPasswordButton type="submit" />
    {/if}
    <AuthSwitch prefix="You want to" keyword="sign in" onClick={backToSignIn} />
</form>

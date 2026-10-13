<script lang="ts">
    import mailIcon from "$lib/assets/mail.svg?raw";
    import { requestPasswordReset } from "$lib/api/auth";
    import {
        forgotPasswordErrorMessages,
        forgotPasswordInvalidFields,
    } from "$lib/functions/authFormValidation";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import SendResetLinkButton from "../buttons/sendResetLinkButton.svelte";
    import AuthSwitch from "../authSwitch/authSwitch.svelte";

    let email = $state("");
    let showErrors = $state(false);
    let pending = $state(false);
    let sentMessage = $state("");

    let fieldErrors = $derived(forgotPasswordInvalidFields(email));

    const backToSignIn = () => {
        window.location.href = "/auth";
    };

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        showErrors = true;
        const messages = forgotPasswordErrorMessages(email);
        if (messages.length > 0) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            sentMessage = await requestPasswordReset(email.trim());
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not send the reset link");
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
    <h2 class="text-xl font-semibold">Forgot your password?</h2>
    <p class="text-sm text-zinc-600">
        Enter the email on the account. If it exists, a reset link will be sent.
    </p>
    <hr class="border-[#d9cbbd]" />
    {#if sentMessage}
        <p class="text-sm text-zinc-700">{sentMessage}</p>
    {:else}
        <InputField
            label="Email"
            type="email"
            placeholder="Please enter your email"
            bind:value={email}
            svg={mailIcon}
            invalid={showErrors && fieldErrors.email}
        />
        <hr class="border-[#d9cbbd]" />
        <SendResetLinkButton type="submit" />
    {/if}
    <AuthSwitch prefix="You want to" keyword="sign in" onClick={backToSignIn} />
</form>

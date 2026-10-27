<script lang="ts">
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { changePassword } from "$lib/api/user";
    import {
        changePasswordErrorMessages,
        changePasswordInvalidFields,
    } from "$lib/functions/authFormValidation";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import PasswordStrengthIndicator from "../passwordUtilities/passwordStrengthIndicator.svelte";
    import PasswordConditionsIndicator from "../passwordUtilities/passwordConditionsIndicator.svelte";
    import Button from "../buttons/button.svelte";

    let {
        onCancel = () => {},
        onFinished = () => {},
    }: {
        onCancel?: () => void;
        onFinished?: () => void;
    } = $props();

    let oldPassword = $state("");
    let password = $state("");
    let confirmPassword = $state("");
    let passwordValid = $state(false);
    let showErrors = $state(false);
    let pending = $state(false);
    let doneMessage = $state("");

    let fieldErrors = $derived(
        changePasswordInvalidFields({ oldPassword, password, confirmPassword }),
    );

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        pending = true;
        showErrors = true;
        const messages = changePasswordErrorMessages({ oldPassword, password, confirmPassword });
        if (!passwordValid && !messages.includes("Password does not meet the requirements.")) {
            messages.unshift("Password does not meet the requirements.");
        }
        if (messages.length > 0 || !passwordValid) {
            pending = false;
            alert(messages.join("\n"));
            return;
        }

        try {
            doneMessage = await changePassword(oldPassword, password);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Password change failed");
        } finally {
            pending = false;
        }
    };
</script>

<form class="flex w-full flex-col gap-4 text-zinc-800" novalidate onsubmit={submit}>
    <h2 class="text-xl font-semibold">Change your password.</h2>
    <hr class="border-[#e4d8cb]" />
    {#if doneMessage}
        <p class="text-sm text-zinc-700">{doneMessage}</p>
        <button
            type="button"
            class="h-12 w-full cursor-pointer rounded-lg border border-[#c4b6a6] text-zinc-800 hover:bg-[#efe6dc]"
            onclick={onFinished}
        >
            Sign in again
        </button>
    {:else}
        <InputField
            label="Current password"
            type="password"
            placeholder="Please enter your current password"
            autocomplete="current-password"
            bind:value={oldPassword}
            svg={passwordIcon}
            invalid={showErrors && fieldErrors.oldPassword}
        />
        <InputField
            label="New password"
            type="password"
            placeholder="Please enter your new password"
            autocomplete="new-password"
            bind:value={password}
            svg={passwordIcon}
            invalid={showErrors && !passwordValid}
        />
        <PasswordStrengthIndicator {password} userInput={[]} />
        <InputField
            label="Confirm password"
            type="password"
            placeholder="Please confirm your new password"
            autocomplete="new-password"
            bind:value={confirmPassword}
            svg={passwordIcon}
            invalid={showErrors && fieldErrors.confirmPassword}
        />
        <PasswordConditionsIndicator {password} bind:valid={passwordValid} />
        <hr class="border-[#e4d8cb]" />
        <Button
            type="submit"
            svg={passwordIcon}
            text="Change password"
            isFolded={false}
            gentle={true}
            class="bg-[#6b4f3a] text-white fill-white"
        />
        <button
            type="button"
            class="h-12 w-full cursor-pointer rounded-lg border border-[#c4b6a6] text-zinc-800 hover:bg-[#efe6dc]"
            onclick={onCancel}
        >
            Cancel
        </button>
    {/if}
</form>

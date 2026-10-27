<script lang="ts">
    import passwordIcon from "$lib/assets/password.svg?raw";
    import { MediaQuery } from "svelte/reactivity";
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
    const sideBySide = new MediaQuery("(min-width: 840px) and (max-width: 1499px)");

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
            const message = await changePassword(oldPassword, password);
            alert(message);
            onFinished();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Password change failed");
        } finally {
            pending = false;
        }
    };
</script>

<div class={["pw-layout", sideBySide.current && "is-side"]}>
    <form class="pw-form flex w-full flex-col gap-4 text-zinc-800" novalidate onsubmit={submit}>
        <h2 class="text-xl font-semibold">Change your password.</h2>
        <hr class="border-[#e4d8cb]" />
        <div class="fields">
            <InputField
                class="field-old"
                label="Current password"
                type="password"
                placeholder="Please enter your current password"
                autocomplete="current-password"
                bind:value={oldPassword}
                svg={passwordIcon}
                invalid={showErrors && fieldErrors.oldPassword}
            />
            <InputField
                class="field-password"
                label="New password"
                type="password"
                placeholder="Please enter your new password"
                autocomplete="new-password"
                bind:value={password}
                svg={passwordIcon}
                invalid={showErrors && !passwordValid}
            />
            {#if !sideBySide.current}
                <PasswordStrengthIndicator {password} userInput={[]} />
            {/if}
            <InputField
                class="field-confirm"
                label="Confirm password"
                type="password"
                placeholder="Please confirm your new password"
                autocomplete="new-password"
                bind:value={confirmPassword}
                svg={passwordIcon}
                invalid={showErrors && fieldErrors.confirmPassword}
            />
            {#if !sideBySide.current}
                <PasswordConditionsIndicator {password} bind:valid={passwordValid} />
            {/if}
        </div>
        <hr class="border-[#e4d8cb]" />
        <div class="pw-actions flex flex-col gap-4">
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
        </div>
    </form>
    {#if sideBySide.current}
        <aside class="strength-island" aria-label="Password requirements">
            <p>Password strength</p>
            <PasswordStrengthIndicator {password} userInput={[]} />
            <div class="island-rules">
                <PasswordConditionsIndicator {password} bind:valid={passwordValid} />
            </div>
        </aside>
    {/if}
</div>

<style>
    @reference "../../../app.css";

    .pw-layout {
        display: flex;
        width: 100%;
        align-items: flex-start;
        justify-content: center;
        gap: 1.75rem;
    }

    .pw-form {
        min-width: 0;
        flex: 1 1 auto;
    }

    .fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .pw-layout.is-side .fields {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
            "old old"
            "password confirm";
        align-items: start;
        column-gap: 1.25rem;
        row-gap: 1rem;
    }

    .pw-layout.is-side .fields :global(.field-old) {
        grid-area: old;
    }

    .pw-layout.is-side .fields :global(.field-password) {
        grid-area: password;
    }

    .pw-layout.is-side .fields :global(.field-confirm) {
        grid-area: confirm;
    }

    .pw-actions {
        /* Keep hover scale from being clipped by tight siblings. */
        padding-inline: 0.25rem;
    }

    .strength-island {
        display: flex;
        flex: none;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        min-width: 278px;
        width: max-content;
        border-radius: 1.5rem;
        border: 1px solid #d9cbbd;
        background: #f7f1ea;
        padding: 1rem 1.25rem;
        color: #52525b;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }

    .strength-island p {
        font-size: 0.875rem;
        font-weight: 500;
    }

    .strength-island :global(.w-8) {
        width: 2.75rem;
        height: 0.7rem;
    }

    .island-rules :global(li) {
        white-space: nowrap;
    }
</style>

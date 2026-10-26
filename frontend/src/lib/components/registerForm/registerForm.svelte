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
    import { MediaQuery } from "svelte/reactivity";

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
    const sideBySide = new MediaQuery(
        "(min-width: 840px) and (max-width: 1499px)",
    );

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
                lastname.trim(),
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

<div class={["register", sideBySide.current && "is-side"]}>
    <form class="card" novalidate onsubmit={submit}>
        <h2 class="text-xl font-semibold">
            Welcome aboard. Please create an account to continue.
        </h2>
        <hr class="border-[#d9cbbd]" />
        <div class="fields">
            <InputField
                class="field-first"
                label="Firstname"
                placeholder="Please enter your firstname"
                bind:value={username}
                svg={personIcon}
                invalid={showErrors && fieldErrors.username}
            />
            <InputField
                class="field-last"
                label="Lastname"
                placeholder="Please enter your lastname"
                bind:value={lastname}
                svg={personIcon}
                invalid={showErrors && fieldErrors.lastname}
            />
            <InputField
                class="field-email"
                label="Email"
                type="email"
                placeholder="Please enter your email"
                bind:value={email}
                svg={mailIcon}
                invalid={showErrors && fieldErrors.email}
            />
            <InputField
                class="field-password"
                label="Password"
                type="password"
                placeholder="Please enter your password"
                bind:value={password}
                svg={passwordIcon}
                invalid={showErrors && !passwordValid}
            />
            {#if !sideBySide.current}
                <div class="in-form-strength">
                    <PasswordStrengthIndicator
                        {password}
                        userInput={[username, lastname, email]}
                    />
                </div>
            {/if}
            <InputField
                class="field-confirm"
                label="Confirm Password"
                type="password"
                placeholder="Please confirm your password"
                bind:value={confirmPassword}
                svg={passwordIcon}
                invalid={showErrors && fieldErrors.confirmPassword}
            />
            {#if !sideBySide.current}
                <PasswordConditionsIndicator
                    class="field-rules"
                    {password}
                    bind:valid={passwordValid}
                />
            {/if}
        </div>
        <hr class="border-[#d9cbbd]" />
        <CreateAccountButton type="submit" />
        <AuthSwitch
            prefix="You want to"
            keyword="sign in"
            onClick={onSwitchToLogin}
        />
    </form>
    {#if sideBySide.current}
        <aside class="strength-island" aria-label="Password requirements">
            <p>Password strength</p>
            <PasswordStrengthIndicator
                {password}
                userInput={[username, lastname, email]}
            />
            <div class="island-rules">
                <PasswordConditionsIndicator
                    {password}
                    bind:valid={passwordValid}
                />
            </div>
        </aside>
    {/if}
</div>

<style>
    @reference "../../../app.css";

    .register {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        gap: 1.75rem;
    }

    .card {
        display: flex;
        width: 100%;
        max-width: 28rem;
        flex-direction: column;
        gap: 1rem;
        border-radius: 1.5rem;
        border: 1px solid #d9cbbd;
        background: #f7f1ea;
        padding: 1.5rem;
        color: #27272a;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }

    .fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .register.is-side .card {
        min-width: 0;
        max-width: 48rem;
        flex: 1 1 auto;
    }

    .register.is-side .fields {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
            "first last"
            "password confirm"
            "email email";
        align-items: start;
        column-gap: 1.25rem;
        row-gap: 1rem;
    }

    .register.is-side .fields :global(.field-first) {
        grid-area: first;
    }

    .register.is-side .fields :global(.field-last) {
        grid-area: last;
    }

    .register.is-side .fields :global(.field-email) {
        grid-area: email;
    }

    .register.is-side .fields :global(.field-password) {
        grid-area: password;
    }

    .register.is-side .fields :global(.field-confirm) {
        grid-area: confirm;
    }

    .strength-island {
        display: flex;
        flex: none;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        min-width: 278px;
        width: max-content;
        margin-top: 0;
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

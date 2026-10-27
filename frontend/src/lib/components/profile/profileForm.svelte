<script lang="ts">
    import { onMount } from "svelte";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import mailIcon from "$lib/assets/mail.svg?raw";
    import { getUserInfo } from "$lib/functions/getUserInfo";
    import { isValidEmail } from "$lib/functions/authFormValidation";
    import { logout } from "$lib/api/auth";
    import { updateUser } from "$lib/api/user";
    import { refreshSession, setUser } from "$lib/stores/session.svelte";
    import type { UserInfo } from "$lib/types/userInfo";
    import Button from "$lib/components/buttons/button.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import ChangePasswordForm from "./changePasswordForm.svelte";
    import DeactivateAccountForm from "./deactivateAccountForm.svelte";

    type Mode = "view" | "email" | "phone" | "password" | "deactivate" | "email-done" | "phone-done";

    let userInfo = $state<UserInfo | null>(null);
    let loadError = $state("");
    let mode = $state<Mode>("view");
    let draft = $state("");
    let formError = $state("");
    let pending = $state(false);

    onMount(async () => {
        try {
            userInfo = await getUserInfo();
        } catch (error) {
            loadError = error instanceof Error ? error.message : "Could not load your profile.";
        }
    });

    const display = (value: string | null | undefined) => {
        const trimmed = value?.trim() ?? "";
        return trimmed.length > 0 ? trimmed : "Not set";
    };

    const open = (next: Mode) => {
        formError = "";
        pending = false;
        if (next === "email") {
            draft = userInfo?.email ?? "";
        }
        if (next === "phone") {
            draft = userInfo?.phoneNumber ?? "";
        }
        mode = next;
    };

    const close = () => {
        mode = "view";
        formError = "";
    };

    const signInAgain = async () => {
        try {
            await logout();
        } catch {
            // The password or email change already succeeded, so drop the local session anyway.
        }
        setUser(null);
        window.location.href = "/auth";
    };

    const saveEmail = async () => {
        if (!userInfo || pending) {
            return;
        }
        const email = draft.trim();
        if (!isValidEmail(email)) {
            formError = "Enter a valid email.";
            return;
        }
        if (email === userInfo.email) {
            close();
            return;
        }

        pending = true;
        formError = "";
        try {
            await updateUser({ email });
            userInfo = { ...userInfo, email };
            mode = "email-done";
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not change your email.";
        } finally {
            pending = false;
        }
    };

    const savePhone = async () => {
        if (!userInfo || pending) {
            return;
        }
        const phoneNumber = draft.trim();
        if (phoneNumber === (userInfo.phoneNumber ?? "")) {
            close();
            return;
        }

        pending = true;
        formError = "";
        try {
            await updateUser({ phoneNumber });
            userInfo = { ...userInfo, phoneNumber: phoneNumber.length > 0 ? phoneNumber : null };
            await refreshSession();
            mode = "phone-done";
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not change your phone number.";
        } finally {
            pending = false;
        }
    };
</script>

<div class="w-full rounded-3xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-sm">
    {#if loadError}
        <p class="text-sm text-zinc-700">{loadError}</p>
    {:else if !userInfo}
        <p class="text-sm text-zinc-700">Loading profile...</p>
    {:else}
        <p class="mb-4 text-sm text-zinc-600">
            First and last name come from registration. Email and phone number can be changed here.
        </p>
        <dl class="flex flex-col">
            <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-[#e4d8cb] py-3">
                <dt class="text-sm font-medium text-zinc-700">First name</dt>
                <dd class="truncate text-right text-sm text-zinc-900">{display(userInfo.firstname)}</dd>
            </div>
            <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-[#e4d8cb] py-3">
                <dt class="text-sm font-medium text-zinc-700">Last name</dt>
                <dd class="truncate text-right text-sm">{display(userInfo.lastname)}</dd>
            </div>
            <div class="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e4d8cb] py-3">
                <dt class="text-sm font-medium text-zinc-700">E-mail</dt>
                <dd class="truncate text-right text-sm text-zinc-900">{userInfo.email}</dd>
                <button type="button" class="text-sm font-medium text-[#6b4f3a]" onclick={() => open("email")}>
                    Edit E-mail
                </button>
            </div>
            <div class="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <dt class="text-sm font-medium text-zinc-700">Phone</dt>
                <dd class={["truncate text-right text-sm", userInfo.phoneNumber ? "text-zinc-900" : "text-zinc-400"]}>
                    {display(userInfo.phoneNumber)}
                </dd>
                <button type="button" class="text-sm font-medium text-[#6b4f3a]" onclick={() => open("phone")}>
                    Edit Phone
                </button>
            </div>
        </dl>
        <div class="mt-6 grid grid-cols-2 gap-3">
            <Button
                svg={passwordIcon}
                text="Change password"
                isFolded={false}
                gentle={true}
                class="bg-[#6b4f3a] text-white fill-white"
                onClick={() => open("password")}
            />
            <Button
                svg={closeIcon}
                text="Delete account"
                isFolded={false}
                gentle={true}
                class="bg-[#8f3d32] text-white fill-white"
                onClick={() => open("deactivate")}
            />
        </div>
    {/if}
</div>

{#if mode === "email"}
    <FormWindow
        title="Change email"
        showBreadcrumbs={false}
        acceptText="Confirm"
        onClose={close}
        onCancel={close}
        onAccept={() => void saveEmail()}
    >
        <div class="flex flex-col gap-3">
            <p class="text-sm text-zinc-700">After this change you will need to sign in again.</p>
            <InputField label="E-mail" type="email" placeholder="name@example.com" bind:value={draft} svg={mailIcon} invalid={formError.length > 0} />
            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if mode === "email-done"}
    <FormWindow
        title="Email updated"
        showBreadcrumbs={false}
        acceptText="Sign in again"
        cancelText="Close"
        onClose={() => void signInAgain()}
        onCancel={() => void signInAgain()}
        onAccept={() => void signInAgain()}
    >
        <p class="text-zinc-800">Your email has been updated. Sign in again with the new address.</p>
    </FormWindow>
{/if}

{#if mode === "phone"}
    <FormWindow
        title="Change phone number"
        showBreadcrumbs={false}
        acceptText="Confirm"
        onClose={close}
        onCancel={close}
        onAccept={() => void savePhone()}
    >
        <div class="flex flex-col gap-3">
            <InputField label="Phone" placeholder="Phone number" bind:value={draft} invalid={formError.length > 0} />
            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if mode === "phone-done"}
    <FormWindow
        title="Phone number updated"
        showBreadcrumbs={false}
        acceptText="Close"
        cancelText="Close"
        onClose={close}
        onCancel={close}
        onAccept={close}
    >
        <p class="text-zinc-800">Your phone number has been updated.</p>
    </FormWindow>
{/if}

{#if mode === "password"}
    <FormWindow title="Change password" showBreadcrumbs={false} showActions={false} onClose={close}>
        <ChangePasswordForm onCancel={close} onFinished={() => void signInAgain()} />
    </FormWindow>
{/if}

{#if mode === "deactivate"}
    <FormWindow title="Delete account" showBreadcrumbs={false} showActions={false} onClose={close}>
        <DeactivateAccountForm onCancel={close} />
    </FormWindow>
{/if}

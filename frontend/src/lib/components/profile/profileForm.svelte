<script lang="ts">
    import { onMount } from "svelte";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import { getUserInfo } from "$lib/functions/getUserInfo";
    import { isValidEmail } from "$lib/functions/authFormValidation";
    import { updateUser, type UserUpdate } from "$lib/api/user";
    import { refreshSession } from "$lib/stores/session.svelte";
    import type { UserInfo } from "$lib/types/userInfo";
    import Button from "$lib/components/buttons/button.svelte";
    import ProfileField from "./profileField.svelte";
    import ChangePasswordForm from "./changePasswordForm.svelte";
    import DeactivateAccountForm from "./deactivateAccountForm.svelte";

    type Field = "firstname" | "lastname" | "email" | "phoneNumber";
    type Mode = "details" | "password" | "deactivate";

    let userInfo = $state<UserInfo | null>(null);
    let loadError = $state("");
    let mode = $state<Mode>("details");

    onMount(async () => {
        try {
            userInfo = await getUserInfo();
        } catch (error) {
            loadError = error instanceof Error ? error.message : "Could not load your profile.";
        }
    });

    const blankToNull = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    };

    const nextProfile = (info: UserInfo, field: Field, next: string): UserUpdate => ({
        firstname: field === "firstname" ? next : info.firstname,
        lastname: field === "lastname" ? blankToNull(next) : info.lastname,
        email: field === "email" ? next : info.email,
        phoneNumber: field === "phoneNumber" ? blankToNull(next) : info.phoneNumber,
    });

    const saveField = async (field: Field, next: string) => {
        if (!userInfo) {
            return;
        }

        if (field === "firstname" && next.length === 0) {
            alert("Enter your first name.");
            throw new Error("invalid");
        }
        if (field === "email" && !isValidEmail(next)) {
            alert("Enter a valid email.");
            throw new Error("invalid");
        }

        const profile = nextProfile(userInfo, field, next);
        try {
            await updateUser(profile);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not save your profile.");
            throw error;
        }

        userInfo = {
            ...userInfo,
            firstname: profile.firstname,
            lastname: profile.lastname,
            email: profile.email,
            phoneNumber: profile.phoneNumber,
        };
        await refreshSession();
    };
</script>

<div class="w-full rounded-3xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-sm">
    {#if loadError}
        <p class="text-sm text-zinc-700">{loadError}</p>
    {:else if !userInfo}
        <p class="text-sm text-zinc-700">Loading profile...</p>
    {:else if mode === "password"}
        <ChangePasswordForm onCancel={() => (mode = "details")} />
    {:else if mode === "deactivate"}
        <DeactivateAccountForm onCancel={() => (mode = "details")} />
    {:else}
        <div class="flex flex-col">
            <ProfileField
                label="First name"
                value={userInfo.firstname}
                onSave={(next) => saveField("firstname", next)}
            />
            <ProfileField
                label="Last name"
                value={userInfo.lastname ?? ""}
                onSave={(next) => saveField("lastname", next)}
            />
            <ProfileField
                label="E-mail"
                type="email"
                value={userInfo.email}
                onSave={(next) => saveField("email", next)}
            />
            <ProfileField
                label="Phone"
                value={userInfo.phoneNumber ?? ""}
                onSave={(next) => saveField("phoneNumber", next)}
            />
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
            <Button
                svg={passwordIcon}
                text="Change password"
                isFolded={false}
                gentle={true}
                class="bg-[#6b4f3a] text-white fill-white"
                onClick={() => (mode = "password")}
            />
            <Button
                svg={closeIcon}
                text="Delete account"
                isFolded={false}
                gentle={true}
                class="bg-[#8f3d32] text-white fill-white"
                onClick={() => (mode = "deactivate")}
            />
        </div>
    {/if}
</div>

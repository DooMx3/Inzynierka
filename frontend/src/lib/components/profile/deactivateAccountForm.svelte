<script lang="ts">
    import passwordIcon from "$lib/assets/password.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import { logout } from "$lib/api/auth";
    import { deactivateAccount } from "$lib/api/user";
    import { setUser } from "$lib/stores/session.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import Button from "../buttons/button.svelte";

    let {
        onCancel = () => {},
    }: {
        onCancel?: () => void;
    } = $props();

    let password = $state("");
    let showErrors = $state(false);
    let pending = $state(false);

    let passwordMissing = $derived(password.length === 0);

    const submit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        pending = true;
        showErrors = true;
        if (passwordMissing) {
            pending = false;
            alert("Enter your password.");
            return;
        }

        try {
            await deactivateAccount(password);
            try {
                await logout();
            } catch {
                // The account is already deactivated, so a leftover session can be dropped locally.
            }
            setUser(null);
            window.location.href = "/auth";
        } catch (error) {
            alert(error instanceof Error ? error.message : "Account deactivation failed");
        } finally {
            pending = false;
        }
    };
</script>

<form class="flex w-full flex-col gap-4 text-zinc-800" novalidate onsubmit={submit}>
    <h2 class="text-xl font-semibold">Delete your account.</h2>
    <p class="text-sm text-zinc-700">
        This deactivates the account. If you own a vineyard, delete that vineyard first. Enter your password to confirm.
    </p>
    <hr class="border-[#e4d8cb]" />
    <InputField
        label="Password"
        type="password"
        placeholder="Please enter your password"
        autocomplete="current-password"
        bind:value={password}
        svg={passwordIcon}
        invalid={showErrors && passwordMissing}
    />
    <hr class="border-[#e4d8cb]" />
    <Button
        type="submit"
        svg={closeIcon}
        text="Delete account"
        isFolded={false}
        gentle={true}
        class="bg-[#8f3d32] text-white fill-white"
    />
    <button
        type="button"
        class="h-12 w-full cursor-pointer rounded-lg border border-[#c4b6a6] text-zinc-800 hover:bg-[#efe6dc]"
        onclick={onCancel}
    >
        Cancel
    </button>
</form>

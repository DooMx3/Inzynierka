<script lang="ts">
    import { logout } from "$lib/api/auth";
    import ProfileDropdownButton from "../buttons/profileDropdownButton.svelte";
    import { displayName, session, setUser } from "$lib/stores/session.svelte";

    let { class: className = "" }: { class?: string } = $props();

    let open = $state(false);

    const accountName = $derived(session.user ? displayName(session.user) : "");

    const toggle = (event: MouseEvent) => {
        event.stopPropagation();
        open = !open;
    };

    const close = () => {
        open = false;
    };

    const handleLogout = async (event: MouseEvent) => {
        event.stopPropagation();
        try {
            await logout();
            setUser(null);
            open = false;
            window.location.href = "/";
        } catch (error) {
            alert(error instanceof Error ? error.message : "Logout failed");
        }
    };
</script>

<svelte:window onclick={close} />

{#if session.user}
    <div class={["relative", className]}>
        <ProfileDropdownButton {accountName} expanded={open} onClick={toggle} />
        {#if open}
            <div
                class="absolute right-0 z-50 mt-2 min-w-36 rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-1 shadow-lg"
                role="menu"
            >
                <button
                    type="button"
                    role="menuitem"
                    class="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-zinc-800 hover:bg-[#eae0d5]"
                    onclick={handleLogout}
                >
                    Logout
                </button>
            </div>
        {/if}
    </div>
{/if}

<script lang="ts">
    import { session } from "$lib/stores/session.svelte";
    import { onMount } from "svelte";
    import CreateVineyardButton from "../userMenu/createVineyardButton.svelte";
    import InvitationButton from "../userMenu/invitationButton.svelte";
    import { getUserInvitation } from "$lib/api/organisation";
    import type { organisationInfo } from "$lib/types/organisationInfo";

    let invitation: organisationInfo | null = $state(null);

    onMount(async () => {
        try {
            invitation = await getUserInvitation();
        } catch {
            invitation = null;
        }
    });
</script>

<div class="flex h-full min-h-full flex-col items-center justify-center overflow-y-auto p-8">
    {#if session.user}
        <section class="flex flex-wrap gap-4" aria-label="User menu">
            <CreateVineyardButton />
            <InvitationButton />
        </section>
    {:else}
        <section class="flex min-h-[50vh] items-center justify-center text-zinc-700">
            <p class="text-lg">Sign in to see your menu.</p>
        </section>
    {/if}
</div>

<script lang="ts">
    import { session } from "$lib/stores/session.svelte";
    import CreateVineyardButton from "../userMenu/createVineyardButton.svelte";
    import InvitationButton from "../userMenu/invitationButton.svelte";
</script>

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

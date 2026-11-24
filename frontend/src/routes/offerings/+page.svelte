<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "$lib/stores/session.svelte";

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    onMount(() => {
        if (session.user?.roles.includes("OWNER")) {
            window.location.replace("/management/offerings");
        }
    });
</script>

<svelte:head>
    <title>Vineyard Offerings · Vinery</title>
</svelte:head>

<div class="flex h-full items-center justify-center overflow-y-auto px-4 py-8 sm:px-8">
    <section
        class="flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-8 text-center text-[#3f2e22] shadow-sm"
    >
        <h1 class="text-2xl font-bold text-[#3f2e22]">Vineyard-Specific Offerings</h1>
        {#if isOwner}
            <p class="text-sm leading-relaxed text-zinc-700">
                Redirecting to your vineyard offerings management panel...
            </p>
            <a
                href="/management/offerings"
                class="rounded-xl bg-[#6b4f3a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
            >
                Open Offerings Management →
            </a>
        {:else}
            <p class="text-sm leading-relaxed text-zinc-700">
                Each wine catalog belongs to a specific vineyard. Use a direct vineyard catalog link shared by the winemaker or scan the QR code on a bottle.
            </p>
            <a
                href="/"
                class="rounded-xl bg-[#6b4f3a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
            >
                Return to Home
            </a>
        {/if}
    </section>
</div>

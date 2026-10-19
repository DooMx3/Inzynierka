<script lang="ts">
    import logo from "$lib/assets/logo.webp";
    import loginIcon from "$lib/assets/login.svg?raw";
    import ProfileMenu from "../profileMenu/profileMenu.svelte";
    import SearchField from "../searchField/searchField.svelte";
    import { session } from "$lib/stores/session.svelte";

    let search = $state("");
</script>

<span class="relative z-30 flex items-center justify-center h-24 w-full bg-[#eae0d5]">
    <button class="flex items-center justify-start w-1/3 cursor-pointer" onclick={() => (window.location.href = "/")}>
        <img alt="Logo" src={logo} class="h-24 w-24 mr-2" />
        <p class="text-zinc-800 font-semibold text-2xl">Name goes here</p>
    </button>
    <span class="flex items-center justify-center w-1/3">
        <SearchField
            bind:value={search}
            placeholder="Search"
            class="max-w-md ml-4"
        />
    </span>
    <span class="flex items-center justify-end w-1/3 pr-4">
        {#if session.user}
            <ProfileMenu class="ml-auto" />
        {:else}
            <a
                href="/auth"
                class="sign-in ml-auto flex items-center gap-2 rounded-lg bg-[#e4d3c0] px-3 py-2 text-sm font-medium text-[#4a3428] fill-[#4a3428] stroke-[#4a3428] transition-colors duration-200 hover:bg-[#d4c0a8]"
            >
                <span class="shrink-0" role="img" aria-hidden="true">{@html loginIcon}</span>
                Sign in
            </a>
        {/if}
    </span>
</span>

<style>
    @reference "../../../app.css";

    .sign-in :global(svg) {
        @apply h-6 w-6;
        fill: inherit;
        stroke: inherit;
    }

    .sign-in :global(svg *) {
        fill: inherit;
        stroke: inherit;
    }
</style>

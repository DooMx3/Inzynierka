<script lang="ts">
    import logo from "$lib/assets/logo.webp";
    import loginIcon from "$lib/assets/login.svg?raw";
    import ProfileMenu from "../profileMenu/profileMenu.svelte";
    import SearchField from "../searchField/searchField.svelte";
    import { session } from "$lib/stores/session.svelte";
    import { MediaQuery } from "svelte/reactivity";

    let search = $state("");
    const mobile = new MediaQuery("max-width: 640px");
    let showSearch = $derived(!mobile.current && session.user !== null);
</script>

<span class="relative z-30 flex items-center justify-center h-24 w-full bg-[#eae0d5]">
    <button
        class={[
            "flex min-w-0 items-center justify-start cursor-pointer",
            showSearch ? "w-1/3" : "flex-1",
        ]}
        onclick={() => (window.location.href = "/")}
    >
        <img alt="Logo" src={logo} class="h-24 w-24 shrink-0 mr-2" />
        <p class={["text-zinc-800 font-semibold text-2xl", !showSearch && "whitespace-nowrap"]}>
            Name goes here
        </p>
    </button>
    {#if showSearch}
        <span class="flex items-center justify-center w-1/3">
            <SearchField
                bind:value={search}
                placeholder="Search"
                class="max-w-md ml-4"
            />
        </span>
    {/if}
    <span class={["flex items-center justify-end shrink-0 pr-4", showSearch && "w-1/3"]}>
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

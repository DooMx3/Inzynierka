<script lang="ts">
    import logo from "$lib/assets/logo.webp";
    import loginIcon from "$lib/assets/login.svg?raw";
    import TasksHeaderButton from "../buttons/tasksHeaderButton.svelte";
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
        type="button"
        class={[
            "flex min-w-0 items-center justify-start cursor-pointer",
            showSearch ? "w-1/3" : "flex-1",
        ]}
        onclick={() => (window.location.href = "/")}
    >
        <img alt="Logo" src={logo} class="h-12 w-12 sm:h-24 sm:w-24 shrink-0 mr-1.5 sm:mr-2" />
        <p class={["text-zinc-800 font-semibold text-sm sm:text-2xl truncate", !showSearch && "whitespace-nowrap"]}>
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
    <span class={["flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 pr-2 sm:pr-4", showSearch && "w-1/3"]}>
        <a
            href="/offerings"
            class="ml-auto rounded-lg border border-[#d9cbbd] bg-[#f7f1ea] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[#4a3428] transition-colors hover:bg-[#e4d3c0]"
        >
            Offerings
        </a>
        {#if session.user}
            <TasksHeaderButton />
            <ProfileMenu />
        {:else}
            <a
                href="/auth"
                class="sign-in flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg bg-[#e4d3c0] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[#4a3428] fill-[#4a3428] stroke-[#4a3428] transition-colors duration-200 hover:bg-[#d4c0a8]"
            >
                <span class="shrink-0" role="img" aria-hidden="true">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html loginIcon}
                </span>
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

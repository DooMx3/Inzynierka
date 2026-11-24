<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import "../app.css";
    import "goey-toast-svelte/styles.css";
    import { onMount } from 'svelte';
    import { GooeyToaster } from 'goey-toast-svelte';
    
    import Breadcrumbs from '$lib/components/breadcrumbs/breadcrumbs.svelte';
    import MenuBar from '$lib/components/menuBar/menuBar.svelte';
    import SubpageTitle from '$lib/components/subpageTitle/subpageTitle.svelte';
    import TitleBar from '$lib/components/titleBar/titleBar.svelte';

    import { menu, toggleMenu } from '$lib/stores/menu.svelte';
    import { refreshSession, session } from '$lib/stores/session.svelte';
    import GlassBlur from '$lib/components/glassBlur/glassBlur.svelte';

	let { children } = $props();

    const menuRoles = ["WORKER", "OENOLOGIST", "OWNER"] as const;
    const showMenuBar = $derived(
        menuRoles.some((role) => session.user?.roles?.includes(role)),
    );

    onMount(() => {
        void refreshSession();
    });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GooeyToaster
    position="bottom-right"
    closeButton="top-right"
    showProgress
/>

<div class="relative flex h-dvh min-h-screen bg-[#eae0d5]">
    {#if session.user && showMenuBar}
        <div class="pointer-events-none fixed inset-0 z-40">
            <GlassBlur active={!menu.folded} />
        </div>
        <button
            type="button"
            aria-label="Close menu"
            aria-hidden={menu.folded}
            tabindex={menu.folded ? -1 : 0}
            class={[
                "fixed inset-0 z-40 appearance-none border-0 bg-black/25 md:bg-transparent p-0 transition-opacity duration-200",
                menu.folded ? "pointer-events-none opacity-0" : "opacity-100",
            ]}
            onclick={toggleMenu}
        ></button>
        <div
            class={[
                "fixed md:relative inset-y-0 left-0 z-50 h-full shrink-0 transition-[width] duration-300",
                menu.folded
                    ? "w-0 overflow-hidden md:w-16 md:overflow-visible"
                    : "w-72 md:w-16 overflow-visible",
            ]}
        >
            <MenuBar />
        </div>
    {/if}
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <TitleBar />
        {#if session.user}
            <div
                class={[
                    "relative m-1.5 sm:m-3 flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#eae0d5]",
                    showMenuBar && "md:ml-2",
                ]}
            >
                <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <header class="flex shrink-0 flex-col items-start gap-1 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
                        <Breadcrumbs />
                        <SubpageTitle />
                    </header>
                    <div class="min-h-0 flex-1 overflow-auto px-2.5 pb-3 sm:px-4 sm:pb-4">
                        {@render children()}
                    </div>
                </main>
            </div>
        {:else}
            <div class="relative flex min-h-0 flex-1 overflow-hidden bg-[#eae0d5]">
                <main class="min-h-0 min-w-0 flex-1 overflow-hidden">
                    {@render children()}
                </main>
            </div>
        {/if}
    </div>
</div>

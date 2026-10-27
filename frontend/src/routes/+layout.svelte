<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import "../app.css"
    import { onMount } from 'svelte';
    
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
        menuRoles.some((role) => session.user?.roles.includes(role)),
    );

    onMount(() => {
        void refreshSession();
    });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative flex h-screen bg-[#eae0d5]">
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
                "fixed inset-0 z-40 appearance-none border-0 bg-transparent p-0",
                menu.folded && "pointer-events-none",
            ]}
            onclick={toggleMenu}
        ></button>
        <div class="relative z-50 h-full w-16 shrink-0 overflow-visible">
            <MenuBar />
        </div>
    {/if}
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <TitleBar />
        {#if session.user}
            <div
                class={[
                    "relative m-3 flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#eae0d5]",
                    showMenuBar && "ml-2",
                ]}
            >
                <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <header class="flex shrink-0 flex-col items-start gap-1 px-4 pt-4">
                        <Breadcrumbs />
                        <SubpageTitle />
                    </header>
                    <div class="min-h-0 flex-1 overflow-auto px-4 pb-4">
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

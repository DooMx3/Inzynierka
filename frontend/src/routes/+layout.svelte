<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import "../app.css"
    import { onMount } from 'svelte';
    
    import MenuBar from '$lib/components/menuBar/menuBar.svelte';
    import TitleBar from '$lib/components/titleBar/titleBar.svelte';

    import { menu, toggleMenu } from '$lib/stores/menu.svelte';
    import { refreshSession, session } from '$lib/stores/session.svelte';
    import GlassBlur from '$lib/components/glassBlur/glassBlur.svelte';

	let { children } = $props();

    onMount(() => {
        void refreshSession();
    });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen flex-col bg-[#eae0d5]">
    <TitleBar />
    {#if session.user}
        <div class="relative flex min-h-0 flex-1">
            <div class="relative z-50 w-16 shrink-0 self-stretch overflow-visible">
                <MenuBar />
            </div>
            <div class="relative m-3 ml-2 flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#eae0d5]">
                {#if !menu.folded}
                    <GlassBlur />
                    <button
                        type="button"
                        aria-label="Close menu"
                        class="absolute inset-0 z-40 appearance-none border-0 bg-transparent p-0"
                        onclick={toggleMenu}
                    ></button>
                {/if}
                <main class="min-h-0 min-w-0 flex-1 overflow-auto p-4">
                    {@render children()}
                </main>
            </div>
        </div>
    {:else}
        <div class="relative flex min-h-0 flex-1 overflow-hidden bg-[#eae0d5]">
            <main class="min-h-0 min-w-0 flex-1 overflow-hidden">
                {@render children()}
            </main>
        </div>
    {/if}
</div>

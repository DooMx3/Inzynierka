<script lang="ts">
    import type { ClassValue } from 'svelte/elements';

    let { class: className, id = 'lg' }: { class?: ClassValue; id?: string } = $props();
</script>

<svg width="0" height="0" class="absolute">
    <filter {id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="turbulence" />
        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="10" xChannelSelector="R" yChannelSelector="G" />
    </filter>
</svg>

<div
    class={['glass pointer-events-none absolute inset-0 z-40', className]}
    style:backdrop-filter={`url(#${id}) blur(3px) saturate(100%)`}
></div>

<style>
    .glass {
        background: rgb(75 85 99 / 0.14);
        box-shadow: inset 0 1px 0 #ffffff5c;
    }
</style>

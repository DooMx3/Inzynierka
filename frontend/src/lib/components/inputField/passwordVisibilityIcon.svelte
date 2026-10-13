<script lang="ts">
    import visibilityIcon from "$lib/assets/visibility.svg?raw";
    import visibilityOffIcon from "$lib/assets/visibility_off.svg?raw";

    let { concealed }: { concealed: boolean } = $props();

    const iconPath = (svg: string) => svg.match(/\bd="([^"]*)"/)?.[1] ?? "";

    const openEye = iconPath(visibilityIcon);
    const closedEye = iconPath(visibilityOffIcon);
</script>

<svg
    class={["eye", concealed && "concealed"]}
    viewBox="0 -960 960 960"
    aria-hidden="true"
>
    <path class="open" d={openEye} />
    <path class="closed" d={closedEye} />
    <path class="slash" d="M84-820 L820-84" />
</svg>

<style>
    svg {
        display: block;
        width: 1.25rem;
        height: 1.25rem;
        fill: inherit;
        stroke: inherit;
        overflow: visible;
    }

    .open,
    .closed,
    .slash {
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }

    .open {
        opacity: 1;
        transition: opacity 200ms ease 40ms;
    }

    .closed {
        opacity: 0;
        transition: opacity 180ms ease;
    }

    .slash {
        fill: none;
        stroke: inherit;
        stroke-width: 79.2;
        stroke-linecap: butt;
        stroke-dasharray: 1041;
        stroke-dashoffset: 1041;
        opacity: 1;
        transition:
            stroke-dashoffset 440ms cubic-bezier(0.65, 0, 0.35, 1) 70ms,
            opacity 160ms ease;
    }

    .concealed .open {
        opacity: 0;
        transition: opacity 220ms ease 250ms;
    }

    .concealed .closed {
        opacity: 1;
        transition: opacity 220ms ease 250ms;
    }

    .concealed .slash {
        stroke-dashoffset: 0;
        opacity: 0;
        transition:
            stroke-dashoffset 460ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 140ms ease 400ms;
    }

    @media (prefers-reduced-motion: reduce) {
        .open,
        .closed,
        .slash {
            transition: none;
        }
    }
</style>

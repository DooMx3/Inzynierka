import { quintOut } from 'svelte/easing';

export const AUTH_SLIDE_DURATION = 250;

export const authSlide = (
    node: HTMLElement,
    params: { panel: 'login' | 'register'; phase: 'in' | 'out'; animate: boolean },
) => {
    const direction = params.panel === 'login' ? 1 : -1;
    const available = node.parentElement?.clientWidth ?? 0;
    const distance = Math.max(available, 1000);
    const duration = params.animate ? AUTH_SLIDE_DURATION : 0;

    return {
        duration,
        delay: params.animate && params.phase === 'in' ? duration : 0,
        easing: quintOut,
        css: (_t: number, u: number) => `transform: translate(${direction * distance * u}px, 0);`,
    };
}

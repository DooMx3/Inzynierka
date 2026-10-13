import { describe, it, expect } from 'bun:test';
import { AUTH_SLIDE_DURATION, authSlide } from './authSlide';

const nodeWithWidth = (width: number) => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', { value: width });
    parent.appendChild(node);
    return node;
};

describe('Auth slide', () => {
    it('lets the current view leave before the next one appears', () => {
        const node = nodeWithWidth(1400);
        const incoming = authSlide(node, { panel: 'login', phase: 'in', animate: true });
        const outgoing = authSlide(node, { panel: 'register', phase: 'out', animate: true });

        expect(outgoing.delay).toBe(0);
        expect(outgoing.duration).toBe(AUTH_SLIDE_DURATION);
        expect(incoming.delay).toBe(AUTH_SLIDE_DURATION);
        expect(incoming.duration).toBe(AUTH_SLIDE_DURATION);
    });

    it('moves login across the whole available width', () => {
        const slide = authSlide(nodeWithWidth(1400), {
            panel: 'login',
            phase: 'out',
            animate: true,
        });

        expect(slide.css(0, 1)).toBe('transform: translate(1400px, 0);');
        expect(slide.css(1, 0)).toBe('transform: translate(0px, 0);');
    });

    it('moves registration across the whole available width the other way', () => {
        const slide = authSlide(nodeWithWidth(1600), {
            panel: 'register',
            phase: 'out',
            animate: true,
        });

        expect(slide.css(0, 1)).toBe('transform: translate(-1600px, 0);');
    });

    it('still travels a full screen when the container width is unknown', () => {
        const slide = authSlide(document.createElement('div'), {
            panel: 'login',
            phase: 'out',
            animate: true,
        });

        expect(slide.css(0, 1)).toBe('transform: translate(1000px, 0);');
    });

    it('stays in place until the user switches forms', () => {
        const slide = authSlide(nodeWithWidth(1400), {
            panel: 'login',
            phase: 'in',
            animate: false,
        });

        expect(slide.duration).toBe(0);
        expect(slide.delay).toBe(0);
    });
});

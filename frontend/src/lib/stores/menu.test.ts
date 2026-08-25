import { describe, it, expect, beforeEach } from 'bun:test';
import { menu, toggleMenu } from './menu.svelte';

describe('Menu store', () => {
    beforeEach(() => {
        menu.folded = true;
    });

    it('Check starts folded', () => {
        expect(menu.folded).toBe(true);
    });

    it('Check toggle expands the menu', () => {
        toggleMenu();

        expect(menu.folded).toBe(false);
    });

    it('Check toggle collapses the menu again', () => {
        toggleMenu();
        toggleMenu();

        expect(menu.folded).toBe(true);
    });
});

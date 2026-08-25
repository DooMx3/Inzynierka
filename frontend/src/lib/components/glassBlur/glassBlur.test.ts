import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import GlassBlur from './glassBlur.svelte';

describe('Glass blur', () => {
    it('Check svg filter is present', () => {
        const { container } = render(GlassBlur);
        const filter = container.querySelector('filter#lg');

        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(filter).toBeInTheDocument();
        expect(filter?.querySelector('feTurbulence')).toBeInTheDocument();
        expect(filter?.querySelector('feDisplacementMap')).toBeInTheDocument();
    });

    it('Check overlay is a visual layer not a button', () => {
        const { container } = render(GlassBlur);
        const overlay = container.querySelector('.glass');

        expect(overlay).toBeInTheDocument();
        expect(overlay?.tagName).toBe('DIV');
        expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    it('Check overlay covers the parent', () => {
        const { container } = render(GlassBlur);
        const overlay = container.querySelector('.glass');

        expect(overlay).toHaveClass('absolute', 'inset-0', 'z-40', 'pointer-events-none');
    });

    it('Check extra class', () => {
        const { container } = render(GlassBlur, { class: 'fixed' });
        const overlay = container.querySelector('.glass');

        expect(overlay).toHaveClass('fixed');
    });
});

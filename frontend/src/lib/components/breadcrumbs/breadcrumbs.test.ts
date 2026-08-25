import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'bun:test';
import Breadcrumbs from './breadcrumbs.svelte';

const setPathname = (pathname: string) => {
    window.location.href = `http://localhost${pathname.startsWith('/') ? '' : '/'}${pathname}`;
};

describe('Breadcrumbs', () => {
    beforeEach(() => {
        setPathname('/');
    });

    it('renders a span element', () => {
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('renders empty string when on root path with no additionalCrumbs', () => {
        setPathname('/');
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')!.textContent).toBe('');
    });

    it('renders a single segment from pathname', () => {
        setPathname('/vinery');
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')).toHaveTextContent('Vinery');
    });

    it('capitalizes each pathname segment', () => {
        setPathname('/field-work');
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')).toHaveTextContent('Field-work');
    });

    it('joins multiple pathname segments with " / "', () => {
        setPathname('/vinery/plots');
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')).toHaveTextContent('Vinery / Plots');
    });

    it('appends additionalCrumbs after pathname segments', () => {
        setPathname('/vinery');
        const { container } = render(Breadcrumbs, { additionalCrumbs: ['Plot 1'] });
        expect(container.querySelector('span')).toHaveTextContent('Vinery / Plot 1');
    });

    it('capitalizes additionalCrumbs', () => {
        setPathname('/');
        const { container } = render(Breadcrumbs, { additionalCrumbs: ['details'] });
        expect(container.querySelector('span')).toHaveTextContent('Details');
    });

    it('handles multiple additionalCrumbs', () => {
        setPathname('/');
        const { container } = render(Breadcrumbs, { additionalCrumbs: ['Workers', 'John'] });
        expect(container.querySelector('span')).toHaveTextContent('Workers / John');
    });

    it('combines pathname and multiple additionalCrumbs', () => {
        setPathname('/raports');
        const { container } = render(Breadcrumbs, { additionalCrumbs: ['2024', 'January'] });
        expect(container.querySelector('span')).toHaveTextContent('Raports / 2024 / January');
    });

    it('has text-zinc-400 class', () => {
        const { container } = render(Breadcrumbs, { additionalCrumbs: [] });
        expect(container.querySelector('span')).toHaveClass('text-zinc-400');
    });
});

import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'bun:test';
import SubpageTitle from './subpageTitle.svelte';

const setPathname = (pathname: string) => {
    window.location.href = `http://localhost${pathname.startsWith('/') ? '' : '/'}${pathname}`;
};

describe('SubpageTitle', () => {
    beforeEach(() => {
        setPathname('/');
    });

    it('renders a span element', () => {
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toBeInTheDocument();
    });

    it('has expected typography and color classes', () => {
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toHaveClass('text-zinc-500', 'text-3xl', 'font-bold');
    });

    it('renders empty content when on root path', () => {
        setPathname('/');
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span?.textContent).toBe('');
    });

    it('renders single segment title with capitalized first letter', () => {
        setPathname('/vinery');
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Vinery');
    });

    it('renders only the last segment for nested routes', () => {
        setPathname('/vinery/plots');
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Plots');
    });

    it('renders only the last segment for deeply nested routes', () => {
        setPathname('/agriculture/fields/section-a');
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Section-a');
    });

    it('handles trailing slashes correctly', () => {
        setPathname('/workers/');
        const { container } = render(SubpageTitle);
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Workers');
    });

    it('renders custom text when provided via text prop', () => {
        const { container } = render(SubpageTitle, { text: 'Create Vineyard' });
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Create Vineyard');
    });

    it('prioritizes text prop over current route pathname', () => {
        setPathname('/vinery/plots');
        const { container } = render(SubpageTitle, { text: 'Custom Modal Title' });
        const span = container.querySelector('span');
        expect(span).toHaveTextContent('Custom Modal Title');
    });

    it('replaces dynamic UUID segments on offerings and QR routes with clean titles', () => {
        setPathname('/offerings/vineyard/550e8400-e29b-41d4-a716-446655440000');
        const first = render(SubpageTitle);
        expect(first.container.querySelector('span')).toHaveTextContent('Vineyard Offerings');
        first.unmount();

        setPathname('/offerings/550e8400-e29b-41d4-a716-446655440000');
        const second = render(SubpageTitle);
        expect(second.container.querySelector('span')).toHaveTextContent('Wine Details');
    });
});

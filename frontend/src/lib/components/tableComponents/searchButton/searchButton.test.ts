import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SearchButton from './searchButton.svelte';

describe('SearchButton', () => {
    it('renders a button', () => {
        const { container } = render(SearchButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('has default text "Search"', () => {
        render(SearchButton);
        const btn = screen.getByRole('button', { name: /Search/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Search');
    });

    it('renders with custom text', () => {
        render(SearchButton, { text: 'Find' });
        const btn = screen.getByRole('button', { name: /Find/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Find');
    });

    it('renders the search icon SVG', () => {
        const { container } = render(SearchButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(SearchButton, { onClick: () => { clicked = true; } });

        const btn = screen.getByRole('button', { name: /Search/i });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('has blue background class', () => {
        const { container } = render(SearchButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('bg-blue-500');
    });

    it('has white text and fill classes', () => {
        const { container } = render(SearchButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('text-white', 'fill-white');
    });

    it('icon is to the left of the text', () => {
        const { container } = render(SearchButton);
        const btn = container.querySelector('button')!;
        const svgSpan = btn.firstElementChild;
        const textSpan = btn.children[1];

        expect(svgSpan?.querySelector('svg')).toBeInTheDocument();
        expect(textSpan).toHaveTextContent('Search');
    });
});

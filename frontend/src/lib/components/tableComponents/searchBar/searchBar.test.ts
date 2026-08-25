import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SearchBar from './searchBar.svelte';

describe('SearchBar', () => {
    it('renders label "What are you looking for?"', () => {
        render(SearchBar);
        expect(screen.getByText('What are you looking for?')).toBeInTheDocument();
    });

    it('renders text input with default placeholder "Search"', () => {
        render(SearchBar);
        const input = screen.getByPlaceholderText('Search');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('type', 'text');
    });

    it('supports custom placeholder passed via prop', () => {
        render(SearchBar, { placeholder: 'Search batches...' });
        const input = screen.getByPlaceholderText('Search batches...');
        expect(input).toBeInTheDocument();
    });

    it('renders search icon SVG', () => {
        const { container } = render(SearchBar);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('places search icon before the input field', () => {
        const { container } = render(SearchBar);
        const inputWrapper = container.querySelector('.bg-zinc-800');
        expect(inputWrapper).toBeInTheDocument();

        const firstChild = inputWrapper?.firstElementChild;
        const input = inputWrapper?.querySelector('input');

        expect(firstChild?.querySelector('svg')).toBeInTheDocument();
        expect(inputWrapper?.lastElementChild).toBe(input);
    });

    it('updates value when user types into input', async () => {
        render(SearchBar);
        const input = screen.getByPlaceholderText('Search') as HTMLInputElement;

        await fireEvent.input(input, { target: { value: 'Cabernet Sauvignon' } });
        expect(input.value).toBe('Cabernet Sauvignon');
    });

    it('has expected layout and styling classes', () => {
        const { container } = render(SearchBar);
        const root = container.firstElementChild;
        expect(root).toHaveClass('flex', 'items-center', 'flex-col', 'gap-2');

        const inputWrapper = container.querySelector('.bg-zinc-800');
        expect(inputWrapper).toHaveClass('rounded-lg', 'bg-zinc-800', 'h-10');

        const input = container.querySelector('input');
        expect(input).toHaveClass('bg-transparent', 'text-white');
    });
});

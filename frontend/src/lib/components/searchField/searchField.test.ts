import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SearchField from './searchField.svelte';

describe('Search field', () => {
    it('Check placeholder', () => {
        render(SearchField, { placeholder: 'Search projects' });

        const input = screen.getByPlaceholderText('Search projects');
        expect(input).toBeInTheDocument();
    });

    it('Check extra class', () => {
        const testingClass = 'mt-8';
        const { container } = render(SearchField, {
            class: testingClass,
            placeholder: 'Search',
        });

        expect(container.firstElementChild).toHaveClass(testingClass);
    });

    it('Check tailwind colors', () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        const field = input.parentElement;

        expect(field).toHaveClass('bg-zinc-700', 'border-zinc-500', 'text-zinc-400', 'rounded-full');
        expect(input).toHaveClass('text-zinc-300', 'placeholder:text-zinc-500');
    });

    it('Check label is absent', () => {
        const { container } = render(SearchField, { placeholder: 'Search' });

        expect(container.querySelector('label')).not.toBeInTheDocument();
    });

    it('Check search svg is present', () => {
        const { container } = render(SearchField, { placeholder: 'Search' });
        const svgs = container.querySelectorAll('svg');

        expect(svgs.length).toBeGreaterThanOrEqual(1);
        expect(svgs[0]).toBeInTheDocument();
    });

    it('Check search svg is on the left of the input', () => {
        const { container } = render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        const field = input.parentElement;
        const searchSvg = container.querySelector('svg');

        expect(field?.firstElementChild?.contains(searchSvg)).toBe(true);
        expect(field?.children[1]).toBe(input);
    });

    it('Check shortcut is on the right of the input', () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        const field = input.parentElement;
        const shortcut = field?.querySelector('kbd');

        expect(shortcut).toBeInTheDocument();
        expect(field?.lastElementChild).toBe(shortcut);
    });

    it('Check shortcut contains control and plus icons with K', () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        const shortcut = input.parentElement?.querySelector('kbd');
        const shortcutSvgs = shortcut?.querySelectorAll('svg');

        expect(shortcutSvgs).toHaveLength(2);
        expect(shortcut).toHaveTextContent('K');
    });

    it('Check typed value', async () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        await fireEvent.input(input, { target: { value: 'svelte' } });

        expect(input).toHaveValue('svelte');
    });

    it('Check input type', () => {
        render(SearchField, { placeholder: 'Search' });

        expect(screen.getByPlaceholderText('Search')).toHaveAttribute('type', 'search');
    });

    it('Check Ctrl+K focuses the input', async () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        expect(input).not.toHaveFocus();

        await fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

        expect(input).toHaveFocus();
    });

    it('Check key without Ctrl does not focus the input', async () => {
        render(SearchField, { placeholder: 'Search' });

        const input = screen.getByPlaceholderText('Search');
        await fireEvent.keyDown(window, { key: 'k' });

        expect(input).not.toHaveFocus();
    });
});

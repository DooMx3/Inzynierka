import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import TitleBar from './titleBar.svelte';

describe('Title bar', () => {
    it('Check logo is present', () => {
        render(TitleBar);

        const logo = screen.getByAltText('Logo');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src');
        expect(logo.getAttribute('src')).not.toBe('../../assets/logo.webp');
        expect(logo.getAttribute('src')).toMatch(/logo/i);
    });

    it('Check logo is imported as an asset', () => {
        render(TitleBar);

        const src = screen.getByAltText('Logo').getAttribute('src') ?? '';
        expect(src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')).toBe(true);
    });

    it('Check app name is present', () => {
        render(TitleBar);

        expect(screen.getByText('Name goes here')).toBeInTheDocument();
    });

    it('Check logo is on the left of the app name', () => {
        const { container } = render(TitleBar);

        const brand = container.firstElementChild?.children[0];
        const logo = screen.getByAltText('Logo');
        const name = screen.getByText('Name goes here');

        expect(brand?.firstElementChild).toBe(logo);
        expect(brand?.lastElementChild).toBe(name);
    });

    it('Check layout', () => {
        const { container } = render(TitleBar);

        expect(container.firstElementChild).toHaveClass(
            'flex',
            'items-center',
            'justify-center',
            'h-24',
            'w-full',
            'bg-zinc-800',
        );
    });

    it('Check three columns', () => {
        const { container } = render(TitleBar);
        const columns = container.firstElementChild?.children;

        expect(columns).toHaveLength(3);
        expect(columns?.[0]).toHaveClass('w-1/3', 'justify-start');
        expect(columns?.[1]).toHaveClass('w-1/3', 'justify-center');
        expect(columns?.[2]).toHaveClass('w-1/3', 'justify-end');
    });

    it('Check search field is in the middle', () => {
        const { container } = render(TitleBar);

        const middle = container.firstElementChild?.children[1];
        const input = screen.getByPlaceholderText('Search');

        expect(middle).toContainElement(input);
    });

    it('Check search placeholder', () => {
        render(TitleBar);

        expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    it('Check typed search value', async () => {
        render(TitleBar);

        const input = screen.getByPlaceholderText('Search');
        await fireEvent.input(input, { target: { value: 'svelte' } });

        expect(input).toHaveValue('svelte');
    });

    it('Check profile dropdown is on the right', () => {
        const { container } = render(TitleBar);

        const right = container.firstElementChild?.children[2];
        const btn = screen.getByRole('button', { name: 'Profile Dropdown' });

        expect(right).toContainElement(btn);
    });

    it('Check profile account name', () => {
        render(TitleBar);

        const btn = screen.getByRole('button', { name: 'Profile Dropdown' });
        expect(btn).toHaveTextContent('Henryk');
    });
});

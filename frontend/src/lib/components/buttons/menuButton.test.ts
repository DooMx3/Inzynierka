import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import MenuButton from './menuButton.svelte';
import testSvg from '$lib/assets/favicon.svg?raw';

describe('Menu button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(MenuButton, { onClick: onClickFunction });

        const btn = screen.getByRole('button', { name: 'Agrokultura' });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if text is present', () => {
        render(MenuButton);

        const btn = screen.getByRole('button', { name: 'Agrokultura' });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Agrokultura');
    });

    it('Check tailwind class', () => {
        render(MenuButton);

        const btn = screen.getByRole('button', { name: 'Agrokultura' });
        expect(btn).toHaveClass('bg-blue-500', 'text-white', 'font-semibold', 'fill-white', 'w-full');
    });

    it('Check chevron is present', () => {
        const { container } = render(MenuButton);
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('Check chevron is on the right of the text', () => {
        render(MenuButton);

        const btn = screen.getByRole('button', { name: 'Agrokultura' });
        const chevron = btn.lastElementChild;

        expect(btn.firstElementChild).toHaveTextContent('Agrokultura');
        expect(chevron).toHaveClass('ml-auto');
        expect(chevron?.querySelector('svg')).toBeInTheDocument();
    });

    it('Check if svg is present', () => {
        const { container } = render(MenuButton, { svg: testSvg });
        const svgs = container.querySelectorAll('svg');

        expect(svgs.length).toBe(2);
    });

    it('Check svg is on the left of the text', () => {
        const { container } = render(MenuButton, { svg: testSvg });

        const btn = screen.getByRole('button', { name: 'Agrokultura' });
        const svg = container.querySelector('svg');

        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.children[1]).toHaveTextContent('Agrokultura');
        expect(btn.lastElementChild).toHaveClass('ml-auto');
    });

    it('Check svg is absent by default', () => {
        render(MenuButton);

        const btn = screen.getByRole('button', { name: 'Agrokultura' });

        expect(btn.children).toHaveLength(2);
        expect(btn.firstElementChild).toHaveTextContent('Agrokultura');
    });
});

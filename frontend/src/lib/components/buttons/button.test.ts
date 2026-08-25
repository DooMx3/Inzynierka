import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import Button from './button.svelte';
import testSvg from '$lib/assets/favicon.svg?raw';

describe('Primary button', () => {
    it('Check tailwind class', () => {
        const testingClass = 'bg-red-100';

        render(Button, { class: testingClass, text: 'Kliknięto' });

        const btn = screen.getByRole('button', { name: 'Kliknięto' });
        expect(btn).toHaveClass(testingClass);
    });

    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(Button, { onClick: onClickFunction, text: 'Kliknięto' });

        const btn = screen.getByRole('button', { name: 'Kliknięto' });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if svg is present', () => {
        const { container } = render(Button, { svg: testSvg, text: 'Kliknięto' });
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('Check svg is on the left of the text', () => {
        const { container } = render(Button, { svg: testSvg, text: 'Kliknięto' });

        const btn = screen.getByRole('button', { name: 'Kliknięto' });
        const svg = container.querySelector('svg');

        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Kliknięto');
    });

    it('Check svg is absent by default', () => {
        const { container } = render(Button, { text: 'Kliknięto' });

        expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('Check if text is present', () => {
        render(Button, { text: 'Kliknięto' });

        const btn = screen.getByRole('button', { name: 'Kliknięto' });
        expect(btn).toBeInTheDocument();
    });
});

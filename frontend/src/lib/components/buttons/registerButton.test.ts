import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import RegisterButton from './registerButton.svelte';

describe('Register button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(RegisterButton, { onClick: onClickFunction });

        const btn = screen.getByRole('button', { name: 'Register' });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if svg is present', () => {
        const { container } = render(RegisterButton);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('Check svg is on the left of the text', () => {
        const { container } = render(RegisterButton);

        const btn = screen.getByRole('button', { name: 'Register' });
        const svg = container.querySelector('svg');

        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Register');
    });

    it('Check if text is present', () => {
        render(RegisterButton);

        const btn = screen.getByRole('button', { name: 'Register' });
        expect(btn).toBeInTheDocument();
    });
});

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import LoginButton from './loginButton.svelte';

describe('Login button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(LoginButton, { onClick: onClickFunction });

        const btn = screen.getByRole('button', { name: 'Login' });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if svg is present', () => {
        const { container } = render(LoginButton);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('Check svg is on the left of the text', () => {
        const { container } = render(LoginButton);

        const btn = screen.getByRole('button', { name: 'Login' });
        const svg = container.querySelector('svg');

        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Login');
    });

    it('uses a small hover scale', () => {
        render(LoginButton);

        const btn = screen.getByRole('button', { name: 'Login' });
        expect(btn).toHaveClass('hover:scale-[1.02]');
        expect(btn).not.toHaveClass('hover:scale-110');
    });

    it('Check if text is present', () => {
        render(LoginButton);

        const btn = screen.getByRole('button', { name: 'Login' });
        expect(btn).toBeInTheDocument();
    });
});

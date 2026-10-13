import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import ResetPasswordButton from './resetPasswordButton.svelte';

describe('Reset password button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        render(ResetPasswordButton, {
            onClick: () => {
                clicked = true;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

        expect(clicked).toBe(true);
    });

    it('uses a small hover scale and keeps the icon before the label', () => {
        const { container } = render(ResetPasswordButton);

        const btn = screen.getByRole('button', { name: 'Reset password' });
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Reset password');
        expect(btn).toHaveClass('hover:scale-[1.02]');
    });
});

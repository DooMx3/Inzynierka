import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SendResetLinkButton from './sendResetLinkButton.svelte';

describe('Send reset link button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        render(SendResetLinkButton, {
            onClick: () => {
                clicked = true;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

        expect(clicked).toBe(true);
    });

    it('uses a small hover scale and keeps the icon before the label', () => {
        const { container } = render(SendResetLinkButton);

        const btn = screen.getByRole('button', { name: 'Send reset link' });
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Send reset link');
        expect(btn).toHaveClass('hover:scale-[1.02]');
    });
});

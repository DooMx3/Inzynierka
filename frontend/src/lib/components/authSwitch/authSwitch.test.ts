import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import AuthSwitch from './authSwitch.svelte';

describe('Auth switch', () => {
    it('draws an or divider across the full row', () => {
        const { container } = render(AuthSwitch, {
            prefix: 'You want to',
            keyword: 'sign in',
        });
        const row = container.querySelector('div > div');
        const lines = row?.querySelectorAll('span.h-px');

        expect(row).toHaveClass('w-full');
        expect(lines).toHaveLength(2);
        expect(lines?.[0]).toHaveClass('flex-1', 'bg-[#d9cbbd]');
        expect(lines?.[1]).toHaveClass('flex-1', 'bg-[#d9cbbd]');
        expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('makes only the keyword clickable and colored', async () => {
        let clicked = false;
        render(AuthSwitch, {
            prefix: 'You want to',
            keyword: 'sign in',
            onClick: () => {
                clicked = true;
            },
        });

        const button = screen.getByRole('button', { name: 'sign in' });
        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveClass('text-[#6b4f3a]', 'transition-colors');
        expect(screen.getByText('You want to')).not.toHaveAttribute('type', 'button');

        await fireEvent.click(button);
        expect(clicked).toBe(true);
        await fireEvent.click(screen.getByText('You want to'));
        expect(clicked).toBe(true);
    });
});

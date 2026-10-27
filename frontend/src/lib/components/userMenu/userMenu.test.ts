import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import UserMenu from './userMenu.svelte';

const icon = '<svg data-testid="menu-icon"></svg>';

describe('User menu button', () => {
    it('shows the label and the icon', () => {
        render(UserMenu, { text: 'Create vineyard', svg: icon });

        expect(screen.getByRole('button', { name: 'Create vineyard' })).toBeInTheDocument();
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('uses the visible words as the accessible name when the label contains markup', () => {
        render(UserMenu, { text: "Create <span class='text-green-700'>new</span> vineyard" });

        expect(screen.getByRole('button', { name: 'Create new vineyard' })).toBeInTheDocument();
    });

    it('calls onClick when the button is enabled', async () => {
        let clicked = 0;
        render(UserMenu, {
            text: 'Edit vineyard',
            onClick: () => {
                clicked += 1;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Edit vineyard' }));

        expect(clicked).toBe(1);
    });

    it('hides the label and ignores clicks while disabled', async () => {
        let clicked = 0;
        render(UserMenu, {
            text: 'Create vineyard',
            disabled: true,
            onClick: () => {
                clicked += 1;
            },
        });

        const button = screen.getByRole('button', { name: 'Create vineyard' });
        expect(button).toBeDisabled();
        expect(button).not.toHaveTextContent('Create vineyard');
        await fireEvent.click(button);

        expect(clicked).toBe(0);
    });
});

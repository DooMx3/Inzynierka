import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import CreateAccountButton from './createAccountButton.svelte';

describe('Create account button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(CreateAccountButton, { onClick: onClickFunction });

        const btn = screen.getByRole('button', { name: 'Create free account' });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if svg is present', () => {
        const { container } = render(CreateAccountButton);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('Check svg is on the left of the text', () => {
        const { container } = render(CreateAccountButton);

        const btn = screen.getByRole('button', { name: 'Create free account' });
        const svg = container.querySelector('svg');

        expect(btn.firstElementChild?.contains(svg)).toBe(true);
        expect(btn.lastElementChild).toHaveTextContent('Create free account');
    });

    it('Check if text is present', () => {
        render(CreateAccountButton);

        const btn = screen.getByRole('button', { name: 'Create free account' });
        expect(btn).toBeInTheDocument();
    });
});

import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import InvitationButton from './invitationButton.svelte';

describe('InvitationButton', () => {
    it('renders a button', () => {
        const { container } = render(InvitationButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('displays the correct label text', () => {
        const { container } = render(InvitationButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveTextContent('You have been invited! Click to review details');
    });

    it('renders the vinery icon SVG', () => {
        const { container } = render(InvitationButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(InvitationButton, { onClick: () => { clicked = true; } });

        const btn = document.querySelector('button')!;
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('does not call onClick when disabled', async () => {
        let clicked = false;
        render(InvitationButton, { onClick: () => { clicked = true; }, disabled: true });

        const btn = document.querySelector('button')!;
        await fireEvent.click(btn);

        expect(clicked).toBe(false);
    });

    it('is disabled when disabled prop is true', () => {
        const { container } = render(InvitationButton, { disabled: true });
        const btn = container.querySelector('button');
        expect(btn).toBeDisabled();
    });

    it('is not disabled by default', () => {
        const { container } = render(InvitationButton);
        const btn = container.querySelector('button');
        expect(btn).not.toBeDisabled();
    });

    it('has disabled styles when disabled', () => {
        const { container } = render(InvitationButton, { disabled: true });
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('opacity-40', 'cursor-not-allowed', 'grayscale');
    });

    it('has hover styles when enabled', () => {
        const { container } = render(InvitationButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('hover:scale-110', 'cursor-pointer');
    });
});

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import { flushSync } from 'svelte';
import AuthPanel from './authPanel.svelte';

describe('Auth panel', () => {
    it('starts on the login form', () => {
        const { container } = render(AuthPanel, { animate: false });

        const panel = container.querySelector('[data-mode="login"]');
        expect(panel).toBeInTheDocument();
        expect(panel).toHaveClass('h-full', 'w-full');
        expect(panel).not.toHaveClass('max-w-md');
        expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    });

    it('slides to registration and back to login', async () => {
        render(AuthPanel, { animate: false });

        await fireEvent.click(screen.getByRole('button', { name: 'create an account' }));
        flushSync();

        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
        flushSync();

        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    });

    it('turns the login card over to password recovery and back', async () => {
        const { container } = render(AuthPanel, { animate: false });

        await fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
        flushSync();

        const card = container.querySelector('.flip-card');
        expect(card).toHaveClass('is-flipped');
        expect(card).toHaveAttribute('data-flipped', 'true');
        expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
        flushSync();

        expect(card).not.toHaveClass('is-flipped');
        expect(card).toHaveAttribute('data-flipped', 'false');
        expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    });
});

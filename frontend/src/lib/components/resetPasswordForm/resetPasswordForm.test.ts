import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import ResetPasswordForm from './resetPasswordForm.svelte';

const readyPassword = 'Superextrasecurepassword1!';

const fillPasswords = async (password: string, confirmPassword: string) => {
    await fireEvent.input(screen.getByLabelText('New password'), { target: { value: password } });
    await fireEvent.input(screen.getByLabelText('Confirm password'), {
        target: { value: confirmPassword },
    });
    flushSync();
};

describe('Reset password form', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    const originalLocation = window.location;
    let alerts: string[];

    beforeEach(() => {
        alerts = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/reset-password?token=reset-token' },
        });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        globalThis.alert = originalAlert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    it('asks for the new password twice when the link has a token', () => {
        render(ResetPasswordForm, { token: 'reset-token' });

        expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
        expect(screen.getByText('At least 16 characters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset password' })).toHaveAttribute('type', 'submit');
    });

    it('explains a link that has no token and does not call the server', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(ResetPasswordForm, { token: '   ' });

        expect(screen.getByText('This reset link is missing a token.')).toBeInTheDocument();
        expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
        expect(called).toBe(false);
    });

    it('refuses a password that is not ready before calling the server', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(ResetPasswordForm, { token: 'reset-token' });
        await fillPasswords('Abcdef1!', 'Abcdef1!');
        await fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
        flushSync();

        expect(called).toBe(false);
        expect(alerts[0]).toContain('Password does not meet the requirements.');
        expect(screen.getByLabelText('New password').parentElement).toHaveClass('border-red-500');
    });

    it('marks the confirm field when the passwords differ', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(ResetPasswordForm, { token: 'reset-token' });
        await fillPasswords(readyPassword, `${readyPassword}x`);
        await fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
        flushSync();

        expect(called).toBe(false);
        expect(alerts[0]).toContain('Passwords do not match.');
        expect(screen.getByLabelText('Confirm password').parentElement).toHaveClass('border-red-500');
    });

    it('sends the token and the new password only after both fields agree', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            expect(String(input)).toBe('/api/user/reset-password');
            expect(init?.body).toBe(
                JSON.stringify({
                    token: 'reset-token',
                    newPassword: readyPassword,
                }),
            );
            return new Response('Password reset successfully.', { status: 200 });
        }) as typeof fetch;

        render(ResetPasswordForm, { token: 'reset-token' });
        await fillPasswords(readyPassword, readyPassword);
        await fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

        await waitFor(() => {
            expect(screen.getByText('Password reset successfully.')).toBeInTheDocument();
        });
        expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
        expect(alerts).toEqual([]);
    });
});

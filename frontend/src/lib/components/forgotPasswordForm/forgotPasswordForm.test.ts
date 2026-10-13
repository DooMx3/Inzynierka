import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import ForgotPasswordForm from './forgotPasswordForm.svelte';

describe('Forgot password form', () => {
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
            value: { href: 'http://localhost/forgot-password' },
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

    it('asks for an email and a way back to sign in', () => {
        render(ForgotPasswordForm);

        expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
        expect(screen.getByRole('button', { name: 'Send reset link' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'sign in' })).toHaveAttribute('type', 'button');
    });

    it('returns to the auth page from the sign in switch', async () => {
        render(ForgotPasswordForm);

        await fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

        expect(window.location.href).toBe('/auth');
    });

    it('refuses an invalid email without calling the server', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(ForgotPasswordForm);
        await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
        flushSync();

        expect(called).toBe(false);
        expect(alerts[0]).toContain('Enter a valid email.');
        expect(screen.getByLabelText('Email').parentElement).toHaveClass('border-red-500');
    });

    it('shows the same confirmation after the request is accepted', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            expect(String(input)).toBe('/api/user/forgot-password');
            expect(init?.body).toBe(JSON.stringify({ email: 'jan.kowalski@example.com' }));
            return new Response(
                'If an account with that email exists, a reset link has been sent.',
                { status: 200 },
            );
        }) as typeof fetch;

        render(ForgotPasswordForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

        await waitFor(() => {
            expect(
                screen.getByText('If an account with that email exists, a reset link has been sent.'),
            ).toBeInTheDocument();
        });
        expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
        expect(alerts).toEqual([]);
    });
});

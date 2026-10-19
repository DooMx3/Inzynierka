import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import DeactivateAccountForm from './deactivateAccountForm.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

describe('Deactivate account form', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    const originalLocation = window.location;
    let alerts: string[];
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        alerts = [];
        calls = [];
        setUser({ id: 'user-1', firstname: 'Jane', email: 'jane.doe@example.com' });
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/profile' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/deactivate') {
                return new Response(JSON.stringify('Account deactivated.'), { status: 200 });
            }
            if (url === '/api/auth/logout') {
                return new Response('', { status: 200 });
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        globalThis.alert = originalAlert;
        setUser(null);
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    it('asks for the password before deactivating', async () => {
        render(DeactivateAccountForm);
        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        flushSync();

        expect(alerts[0]).toBe('Enter your password.');
        expect(screen.getByLabelText('Password').parentElement).toHaveClass('border-red-500');
        expect(calls).toEqual([]);
        expect(window.location.href).toBe('http://localhost/profile');
    });

    it('stays on the form when the password is rejected', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(JSON.stringify({ error: 'Current password is wrong' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;

        render(DeactivateAccountForm);
        await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

        await waitFor(() => {
            expect(alerts[0]).toBe('Current password is wrong');
        });
        expect(window.location.href).toBe('http://localhost/profile');
        expect(session.user?.email).toBe('jane.doe@example.com');
        expect(calls.some((call) => call.url === '/api/auth/logout')).toBe(false);
    });

    it('still leaves for sign-in when logout fails after deactivation', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/deactivate') {
                return new Response(JSON.stringify('Account deactivated.'), { status: 200 });
            }
            return new Response('session already gone', { status: 401 });
        }) as typeof fetch;

        render(DeactivateAccountForm);
        await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'old-password' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/auth');
        });
        expect(session.user).toBeNull();
        expect(alerts).toEqual([]);
        expect(calls.map((call) => call.url)).toEqual(['/api/user/deactivate', '/api/auth/logout']);
    });

    it('returns through cancel without calling the server', async () => {
        let cancelled = false;
        render(DeactivateAccountForm, { onCancel: () => (cancelled = true) });

        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(cancelled).toBe(true);
        expect(calls).toEqual([]);
        expect(session.user?.email).toBe('jane.doe@example.com');
    });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import ProfileMenu from './profileMenu.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

describe('Profile menu', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    const originalLocation = window.location;

    beforeEach(() => {
        setUser({ id: '1', firstname: 'Anna', email: 'anna@example.com' });
        globalThis.alert = (() => {}) as typeof alert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/' },
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
        setUser(null);
    });

    it('stays hidden when nobody is signed in', () => {
        setUser(null);
        render(ProfileMenu);

        expect(screen.queryByRole('button', { name: 'Profile Dropdown' })).not.toBeInTheDocument();
    });

    it('shows the username and opens a menu with logout', async () => {
        render(ProfileMenu);

        const button = screen.getByRole('button', { name: 'Profile Dropdown' });
        expect(button).toHaveTextContent('Anna');
        expect(screen.queryByRole('menuitem', { name: 'Logout' })).not.toBeInTheDocument();

        await fireEvent.click(button);
        flushSync();

        expect(button).toHaveAttribute('aria-expanded', 'true');
        const logoutItem = screen.getByRole('menuitem', { name: 'Logout' });
        expect(logoutItem.querySelector('svg')).not.toBeNull();
    });

    it('logs out and clears the session', async () => {
        let logoutCalled = false;
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            logoutCalled = String(input) === '/api/auth/logout' && init?.method === 'POST';
            return new Response('', { status: 200 });
        }) as typeof fetch;

        render(ProfileMenu);
        await fireEvent.click(screen.getByRole('button', { name: 'Profile Dropdown' }));
        await fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));

        await waitFor(() => {
            expect(session.user).toBeNull();
        });
        expect(logoutCalled).toBe(true);
        expect(window.location.href).toBe('/auth');
    });
});

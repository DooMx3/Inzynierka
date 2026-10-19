import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tick } from 'svelte';
import UserHome from './userHome.svelte';
import { setUser } from '$lib/stores/session.svelte';

const invitation = { id: 'org-1', name: 'North vineyard' };

describe('User home', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
        setUser(null);
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(JSON.stringify(invitation), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;
    });

    afterEach(() => {
        setUser(null);
        globalThis.fetch = originalFetch;
    });

    const shown = async () => {
        render(UserHome);
        await waitFor(() => {
            expect(calls.some((call) => call.url === '/api/user/invitations')).toBe(true);
        });
        await tick();
    };

    it('hides the user menu when nobody is signed in', async () => {
        await shown();

        expect(screen.queryByRole('region', { name: 'User menu' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /vineyard/i })).not.toBeInTheDocument();
        expect(screen.getByText('Sign in to see your menu.')).toBeInTheDocument();
        expect(calls[0]?.init?.method).toBe('GET');
    });

    it('shows the user menu for a signed-in user', async () => {
        setUser({ id: '1', firstname: 'Anna', email: 'anna@example.com' });
        await shown();

        expect(screen.getByRole('region', { name: 'User menu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create new vineyard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invited/i })).toBeInTheDocument();
    });

    it('keeps the menu when the invitation request fails', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response('missing', { status: 500 });
        }) as typeof fetch;
        setUser({ id: '1', firstname: 'Anna', email: 'anna@example.com' });

        await shown();

        expect(screen.getByRole('region', { name: 'User menu' })).toBeInTheDocument();
    });
});

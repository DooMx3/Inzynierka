import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { displayName, refreshSession, session, setUser } from './session.svelte';

describe('Session store', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setUser(null);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    it('starts without a user', () => {
        expect(session.user).toBeNull();
    });

    it('stores the signed-in user', () => {
        setUser({ id: '1', firstname: 'Henryk', email: 'henryk@example.com' });

        expect(session.user?.firstname).toBe('Henryk');
    });

    it('uses the first name as the visible account name', () => {
        expect(displayName({ id: '1', firstname: ' Henryk ', email: 'henryk@example.com' })).toBe(
            'Henryk',
        );
    });

    it('falls back to the email when the first name is blank', () => {
        expect(displayName({ id: '1', firstname: '   ', email: 'henryk@example.com' })).toBe(
            'henryk@example.com',
        );
    });

    it('restores the session from the current user endpoint', async () => {
        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify({
                    id: '1',
                    firstname: 'Anna',
                    lastname: 'Nowak',
                    email: 'anna@example.com',
                }),
                { status: 200 },
            )) as typeof fetch;

        await refreshSession();

        expect(session.user).toEqual({
            id: '1',
            firstname: 'Anna',
            lastname: 'Nowak',
            email: 'anna@example.com',
            roles: [],
        });
    });

    it('clears the session when the user is not authenticated', async () => {
        setUser({ id: '1', firstname: 'Anna', email: 'anna@example.com' });
        globalThis.fetch = (async () => new Response('', { status: 401 })) as typeof fetch;

        await refreshSession();

        expect(session.user).toBeNull();
    });
});

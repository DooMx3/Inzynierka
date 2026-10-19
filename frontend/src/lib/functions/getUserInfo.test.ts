import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getUserInfo } from './getUserInfo';

const userInfo = {
    active: true,
    email: 'jane.doe@example.com',
    firstname: 'Jane',
    id: 'user-1',
    lastname: 'Doe',
    membershipStatus: 'MEMBER',
    phoneNumber: '987654332',
    roles: ['USER'],
};

describe('getUserInfo', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('loads the current user from /api/user/info', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(JSON.stringify(userInfo), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;

        expect(await getUserInfo()).toEqual(userInfo);
        expect(calls[0]?.url).toBe('/api/user/info');
        expect(calls[0]?.init?.method).toBe('GET');
    });

    it('throws when the profile cannot be loaded', async () => {
        globalThis.fetch = (async () => new Response('missing', { status: 403 })) as typeof fetch;

        const error = await getUserInfo().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Failed to fetch user info');
    });
});

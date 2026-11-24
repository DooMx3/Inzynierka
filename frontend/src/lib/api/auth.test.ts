import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    apiFetch,
    ApiError,
    fetchCurrentUser,
    login,
    logout,
    refreshAccessToken,
    register,
    requestPasswordReset,
    resetPassword,
} from './auth';

const userPayload = {
    id: 'user-1',
    firstname: 'Jan',
    lastname: 'Kowalski',
    email: 'jan.kowalski@example.com',
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('Auth API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('logs in and then loads the current user', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/auth/authenticate') {
                return new Response('', { status: 200 });
            }
            if (url === '/api/user/info') {
                return jsonResponse(userPayload);
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;

        const user = await login('jan.kowalski@example.com', 'Superextrasecurepassword1!');

        expect(user).toEqual({ ...userPayload, roles: [] });
        expect(calls[0]?.url).toBe('/api/auth/authenticate');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                email: 'jan.kowalski@example.com',
                password: 'Superextrasecurepassword1!',
            }),
        );
        expect(calls[1]?.url).toBe('/api/user/info');
    });

    it('registers with firstname, lastname, email and password', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/auth/register') {
                return new Response('', { status: 200 });
            }
            return jsonResponse(userPayload);
        }) as typeof fetch;

        const user = await register(
            'Jan',
            'Kowalski',
            'jan.kowalski@example.com',
            'Superextrasecurepassword1!',
        );

        expect(user.firstname).toBe('Jan');
        expect(user.lastname).toBe('Kowalski');
        expect(calls[0]?.url).toBe('/api/auth/register');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                firstname: 'Jan',
                lastname: 'Kowalski',
                email: 'jan.kowalski@example.com',
                password: 'Superextrasecurepassword1!',
            }),
        );
    });

    it('returns null when the session cookie is missing and refresh fails', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response('', { status: 401 });
        }) as typeof fetch;

        expect(await fetchCurrentUser()).toBeNull();
        expect(calls.map((c) => c.url)).toEqual(['/api/user/info', '/api/auth/refresh']);
    });

    it('refreshes the access token on 401 and retries the original request', async () => {
        let refreshed = false;
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/auth/refresh') {
                refreshed = true;
                return new Response('', { status: 200 });
            }
            if (url === '/api/user/info') {
                return refreshed
                    ? jsonResponse({ ...userPayload, roles: ['OWNER'] })
                    : new Response('', { status: 401 });
            }
            if (url === '/api/equipment') {
                return refreshed
                    ? jsonResponse([{ id: 'eq-1', name: 'Tank 1' }])
                    : new Response('', { status: 401 });
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;

        const user = await fetchCurrentUser();
        expect(user).toEqual({ ...userPayload, roles: ['OWNER'] });
        expect(calls.map((c) => c.url)).toEqual([
            '/api/user/info',
            '/api/auth/refresh',
            '/api/user/info',
        ]);

        refreshed = false;
        calls = [];
        const eqRes = await apiFetch('/api/equipment');
        expect(eqRes.status).toBe(200);
        expect(calls.map((c) => c.url)).toEqual([
            '/api/equipment',
            '/api/auth/refresh',
            '/api/equipment',
        ]);
    });

    it('deduplicates concurrent token refresh requests', async () => {
        let refreshCount = 0;
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/auth/refresh') {
                refreshCount += 1;
                await new Promise((r) => setTimeout(r, 15));
                return new Response('', { status: 200 });
            }
            return new Response('', { status: 200 });
        }) as typeof fetch;

        const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
        expect(a).toBe(true);
        expect(b).toBe(true);
        expect(refreshCount).toBe(1);
    });

    it('surfaces invalid credentials from the login response', async () => {
        globalThis.fetch = (async () =>
            jsonResponse({ error: 'Invalid credentials' }, 401)) as typeof fetch;

        const error = await login('jan.kowalski@example.com', 'wrong').catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Invalid credentials');
        expect((error as ApiError).status).toBe(401);
    });

    it('joins field validation errors from the register response', async () => {
        globalThis.fetch = (async () =>
            jsonResponse({ password: 'Password must have at least 16 characters' }, 400)) as typeof fetch;

        const error = await register('Jan', 'Kowalski', 'jan.kowalski@example.com', 'short').catch(
            (caught: unknown) => caught,
        );

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('password: Password must have at least 16 characters');
    });

    it('requests a reset link for an email and reads the plain message', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(
                'If an account with that email exists, a reset link has been sent.',
                { status: 200 },
            );
        }) as typeof fetch;

        const message = await requestPasswordReset('jan.kowalski@example.com');

        expect(message).toBe('If an account with that email exists, a reset link has been sent.');
        expect(calls[0]?.url).toBe('/api/user/forgot-password');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({ email: 'jan.kowalski@example.com' }),
        );
    });

    it('resets the password with the token from the email link', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(JSON.stringify('Password reset successfully.'), { status: 200 });
        }) as typeof fetch;

        const message = await resetPassword('reset-token', 'Superextrasecurepassword1!');

        expect(message).toBe('Password reset successfully.');
        expect(calls[0]?.url).toBe('/api/user/reset-password');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                token: 'reset-token',
                newPassword: 'Superextrasecurepassword1!',
            }),
        );
    });

    it('logs out through the auth endpoint', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response('', { status: 200 });
        }) as typeof fetch;

        await logout();

        expect(calls[0]?.url).toBe('/api/auth/logout');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
    });
});

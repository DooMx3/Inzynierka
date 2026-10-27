import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { changePassword, deactivateAccount, updateUser } from './user';
import { ApiError } from './auth';

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const profile = {
    email: 'jane.doe@example.com',
    phoneNumber: '987654332',
};

describe('User API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('saves the profile with PATCH /api/user/patch', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response('', { status: 200 });
        }) as typeof fetch;

        await updateUser(profile);

        expect(calls[0]?.url).toBe('/api/user/patch');
        expect(calls[0]?.init?.method).toBe('PATCH');
        expect(calls[0]?.init?.credentials).toBe('include');
        expect(calls[0]?.init?.body).toBe(JSON.stringify(profile));
    });

    it('changes the password without a reset token', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response(JSON.stringify('Password changed successfully.'), { status: 200 });
        }) as typeof fetch;

        const message = await changePassword('old-password', 'Superextrasecurepassword1!');

        expect(message).toBe('Password changed successfully.');
        expect(calls[0]?.url).toBe('/api/user/change-password');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                oldPassword: 'old-password',
                newPassword: 'Superextrasecurepassword1!',
            }),
        );
    });

    it('deactivates the account with the current password', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return jsonResponse('Account deactivated.');
        }) as typeof fetch;

        const message = await deactivateAccount('old-password');

        expect(message).toBe('Account deactivated.');
        expect(calls[0]?.url).toBe('/api/user/deactivate');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
        expect(calls[0]?.init?.body).toBe(JSON.stringify({ password: 'old-password' }));
    });

    it('reads a plain-text success message and falls back when the body is empty', async () => {
        globalThis.fetch = (async () =>
            new Response('Password changed successfully.', { status: 200 })) as typeof fetch;

        expect(await changePassword('old-password', 'Superextrasecurepassword1!')).toBe(
            'Password changed successfully.',
        );

        globalThis.fetch = (async () => new Response('   ', { status: 200 })) as typeof fetch;

        expect(await changePassword('old-password', 'Superextrasecurepassword1!')).toBe(
            'Password changed successfully.',
        );
        expect(await deactivateAccount('old-password')).toBe('Account deactivated.');
    });

    it('keeps a non-string JSON body as the returned message', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;

        expect(await deactivateAccount('old-password')).toBe('{"ok":true}');
    });

    it('surfaces a rejected password change and deactivation', async () => {
        globalThis.fetch = (async () =>
            jsonResponse({ error: 'Current password is wrong' }, 400)) as typeof fetch;

        const passwordError = await changePassword('old-password', 'Superextrasecurepassword1!').catch(
            (caught: unknown) => caught,
        );
        expect(passwordError).toBeInstanceOf(ApiError);
        expect((passwordError as ApiError).message).toBe('Current password is wrong');
        expect((passwordError as ApiError).status).toBe(400);

        globalThis.fetch = (async () => new Response('missing', { status: 403 })) as typeof fetch;

        const deactivateError = await deactivateAccount('old-password').catch(
            (caught: unknown) => caught,
        );
        expect(deactivateError).toBeInstanceOf(ApiError);
        expect((deactivateError as ApiError).message).toBe('missing');
        expect((deactivateError as ApiError).status).toBe(403);
    });

    it('surfaces a failed profile update', async () => {
        globalThis.fetch = (async () => new Response('missing', { status: 404 })) as typeof fetch;

        const error = await updateUser(profile).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
    });
});

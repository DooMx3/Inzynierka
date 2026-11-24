import { describe, it, expect } from 'bun:test';
import { isRedirect } from '@sveltejs/kit';
import {
    guestOnly,
    isGuestPath,
    load as protectedLoad,
    redirectIfSignedIn,
    redirectIfSignedOut,
    sanitizeRedirectTarget,
} from './sessionGate';
import { load as authLoad } from '../../routes/auth/+page.server';
import { load as forgotPasswordLoad } from '../../routes/forgot-password/+page.server';
import { load as resetPasswordLoad } from '../../routes/reset-password/+page.server';
import { load as layoutLoad } from '../../routes/+layout.server';

const signedIn = () => new Response('{}', { status: 200 });
const signedOut = () => new Response('', { status: 403 });

const expectRedirect = async (run: () => unknown, location: string) => {
    try {
        await run();
        expect.unreachable(`expected a redirect to ${location}`);
    } catch (error) {
        expect(isRedirect(error)).toBe(true);
        if (isRedirect(error)) {
            expect(error.status).toBe(303);
            expect(error.location).toBe(location);
        }
    }
};

const eventFor = (pathname: string, response: () => Response) =>
    ({
        fetch: async () => response(),
        url: new URL(pathname, 'http://localhost'),
    }) as never;

describe('Session gate', () => {
    it('sends a signed-in user away from guest pages', async () => {
        await expectRedirect(() => redirectIfSignedIn(async () => signedIn()), '/');
    });

    it('leaves a signed-out user on a guest page', async () => {
        await redirectIfSignedIn(async () => signedOut());
    });

    it('leaves a guest page available when the session check fails', async () => {
        await redirectIfSignedIn(async () => {
            throw new Error('backend down');
        });
    });

    it('guards auth, forgot password, and reset password', async () => {
        for (const load of [authLoad, forgotPasswordLoad, resetPasswordLoad]) {
            expect(load).toBe(guestOnly);
            await expectRedirect(() => load(eventFor('/auth', signedIn)), '/');
        }
    });

    it('sends a signed-out user from app pages to auth and preserves redirectTo for subpages', async () => {
        await expectRedirect(() => redirectIfSignedOut(async () => signedOut()), '/auth');
        await expectRedirect(() => protectedLoad(eventFor('/', signedOut)), '/auth');

        for (const pathname of ['/profile', '/vinery', '/workers', '/qr/equipment/eq-1?from=qr']) {
            await expectRedirect(
                () => protectedLoad(eventFor(pathname, signedOut)),
                `/auth?redirectTo=${encodeURIComponent(pathname)}`,
            );
        }
    });

    it('lets a signed-in user open app pages', async () => {
        await protectedLoad(eventFor('/profile', signedIn));
    });

    it('allows guest access to public offerings and customer bottle QR views without session check', async () => {
        expect(isGuestPath('/offerings')).toBe(true);
        expect(isGuestPath('/offerings/')).toBe(true);
        expect(isGuestPath('/offerings/bottle-uuid-123')).toBe(true);
        expect(isGuestPath('/qr/equipment/eq-1')).toBe(false);

        let called = false;
        for (const publicUrl of [
            'http://localhost/forgot-password',
            'http://localhost/offerings',
            'http://localhost/offerings/wine-1',
        ]) {
            await layoutLoad({
                fetch: async () => {
                    called = true;
                    return signedOut();
                },
                url: new URL(publicUrl),
            } as never);
        }
        expect(called).toBe(false);
        expect(layoutLoad).toBe(protectedLoad);
    });

    it('sanitizes redirect targets against external or auth URLs', () => {
        expect(sanitizeRedirectTarget(null)).toBe('/');
        expect(sanitizeRedirectTarget('https://evil.com')).toBe('/');
        expect(sanitizeRedirectTarget('//evil.com')).toBe('/');
        expect(sanitizeRedirectTarget('/auth?foo=1')).toBe('/');
        expect(sanitizeRedirectTarget('/qr/equipment/123')).toBe('/qr/equipment/123');
    });
});

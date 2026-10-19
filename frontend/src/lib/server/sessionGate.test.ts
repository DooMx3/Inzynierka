import { describe, it, expect } from 'bun:test';
import { isRedirect } from '@sveltejs/kit';
import { guestOnly, load as protectedLoad, redirectIfSignedIn, redirectIfSignedOut } from './sessionGate';
import { load as authLoad } from '../../routes/auth/+page.server';
import { load as forgotPasswordLoad } from '../../routes/forgot-password/+page.server';
import { load as resetPasswordLoad } from '../../routes/reset-password/+page.server';
import { load as layoutLoad } from '../../routes/+layout.server';

const signedIn = () => new Response('{}', { status: 200 });
const signedOut = () => new Response('', { status: 403 });

const expectRedirect = async (run: () => Promise<unknown>, location: string) => {
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

    it('sends a signed-out user from app pages to auth', async () => {
        for (const pathname of ['/', '/profile', '/vinery', '/workers']) {
            await expectRedirect(() => redirectIfSignedOut(async () => signedOut()), '/auth');
            await expectRedirect(() => protectedLoad(eventFor(pathname, signedOut)), '/auth');
        }
    });

    it('lets a signed-in user open app pages', async () => {
        await protectedLoad(eventFor('/profile', signedIn));
    });

    it('does not treat guest pages as app pages', async () => {
        let called = false;
        await layoutLoad({
            fetch: async () => {
                called = true;
                return signedOut();
            },
            url: new URL('http://localhost/forgot-password'),
        } as never);
        expect(called).toBe(false);
        expect(layoutLoad).toBe(protectedLoad);
    });
});

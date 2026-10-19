import { redirect, type ServerLoad } from '@sveltejs/kit';

const guestPaths = new Set(['/auth', '/forgot-password', '/reset-password']);

const normalizePath = (pathname: string) => {
    if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
};

export const isGuestPath = (pathname: string) => guestPaths.has(normalizePath(pathname));

async function currentUser(fetch: typeof globalThis.fetch): Promise<Response | null> {
    try {
        return await fetch('/api/user/info');
    } catch {
        return null;
    }
}

export async function redirectIfSignedIn(fetch: typeof globalThis.fetch): Promise<void> {
    const response = await currentUser(fetch);
    if (response?.ok) {
        redirect(303, '/');
    }
}

export async function redirectIfSignedOut(fetch: typeof globalThis.fetch): Promise<void> {
    const response = await currentUser(fetch);
    if (!response?.ok) {
        redirect(303, '/auth');
    }
}

export const guestOnly: ServerLoad = ({ fetch }) => redirectIfSignedIn(fetch);

export const load: ServerLoad = ({ fetch, url }) => {
    if (isGuestPath(url.pathname)) {
        return;
    }
    return redirectIfSignedOut(fetch);
};

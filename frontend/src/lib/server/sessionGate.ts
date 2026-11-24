import { redirect, type ServerLoad } from '@sveltejs/kit';

const exactGuestPaths = new Set(['/auth', '/forgot-password', '/reset-password']);

const normalizePath = (pathname: string) => {
    if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
};

export const isGuestPath = (pathname: string) => {
    const normalized = normalizePath(pathname);
    if (exactGuestPaths.has(normalized)) {
        return true;
    }
    if (/^\/offerings\/vineyard\/[^/]+$/.test(normalized)) {
        return true;
    }
    if (/^\/offerings\/(?!vineyard(?:\/|$))[^/]+$/.test(normalized)) {
        return true;
    }
    return false;
};

export const sanitizeRedirectTarget = (target: string | null | undefined): string => {
    if (!target) {
        return '/';
    }
    const trimmed = target.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/auth')) {
        return '/';
    }
    return trimmed;
};

const currentUser = async (fetch: typeof globalThis.fetch): Promise<Response | null> => {
    try {
        const response = await fetch('/api/user/info');
        if (response.status !== 401) {
            return response;
        }

        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        });
        if (!refreshResponse.ok) {
            return response;
        }

        return await fetch('/api/user/info');
    } catch {
        return null;
    }
};

export const redirectIfSignedIn = async (fetch: typeof globalThis.fetch): Promise<void> => {
    const response = await currentUser(fetch);
    if (response?.ok) {
        redirect(303, '/');
    }
};

export const redirectIfSignedOut = async (
    fetch: typeof globalThis.fetch,
    targetPath?: string,
): Promise<void> => {
    const response = await currentUser(fetch);
    if (!response?.ok) {
        const safeTarget = sanitizeRedirectTarget(targetPath);
        if (safeTarget !== '/') {
            redirect(303, `/auth?redirectTo=${encodeURIComponent(safeTarget)}`);
        }
        redirect(303, '/auth');
    }
};

export const guestOnly: ServerLoad = ({ fetch }) => redirectIfSignedIn(fetch);

export const load: ServerLoad = ({ fetch, url }) => {
    if (isGuestPath(url.pathname)) {
        return;
    }
    return redirectIfSignedOut(fetch, `${url.pathname}${url.search}`);
};

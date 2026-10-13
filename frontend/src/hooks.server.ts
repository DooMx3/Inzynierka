import type { Handle } from '@sveltejs/kit';

const backend = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8080';

export const handle: Handle = async ({ event, resolve }) => {
    if (!event.url.pathname.startsWith('/api/')) {
        return resolve(event);
    }

    const target = new URL(event.url.pathname + event.url.search, backend);
    const headers = new Headers(event.request.headers);
    headers.delete('host');

    const hasBody = event.request.method !== 'GET' && event.request.method !== 'HEAD';
    const init: RequestInit & { duplex?: 'half' } = {
        method: event.request.method,
        headers,
    };

    if (hasBody) {
        init.body = event.request.body;
        init.duplex = 'half';
    }

    const response = await fetch(target, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
};

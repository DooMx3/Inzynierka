export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export type SessionUser = {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
};

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export async function toApiError(response: Response): Promise<ApiError> {
    const fallback =
        response.status === 401 ? 'Invalid credentials' : `Request failed (${response.status})`;
    const text = await response.text();

    if (!text) {
        return new ApiError(fallback, response.status);
    }

    try {
        const body = JSON.parse(text) as unknown;
        if (body && typeof body === 'object') {
            const record = body as Record<string, unknown>;
            if (typeof record.error === 'string' && record.error.length > 0) {
                return new ApiError(record.error, response.status);
            }

            const details = Object.entries(record)
                .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
                .map(([field, message]) => `${field}: ${message}`);

            if (details.length > 0) {
                return new ApiError(details.join('\n'), response.status);
            }
        }
    } catch {
        return new ApiError(text, response.status);
    }

    return new ApiError(text, response.status);
}

async function readUser(response: Response): Promise<SessionUser> {
    const body = (await response.json()) as Partial<SessionUser>;
    if (typeof body.email !== 'string') {
        throw new ApiError('Unexpected user payload', response.status);
    }

    return {
        id: String(body.id ?? ''),
        firstname: typeof body.firstname === 'string' ? body.firstname : '',
        lastname: typeof body.lastname === 'string' ? body.lastname : '',
        email: body.email,
    };
}

export async function fetchCurrentUser(): Promise<SessionUser | null> {
    const response = await fetch('/api/user/info', { credentials: 'include' });

    if (response.status === 401 || response.status === 403) {
        return null;
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    return readUser(response);
}

async function userAfterAuth(): Promise<SessionUser> {
    const user = await fetchCurrentUser();
    if (!user) {
        throw new ApiError('Signed in, but the session could not be loaded.', 401);
    }
    return user;
}

export async function login(email: string, password: string): Promise<SessionUser> {
    const response = await fetch('/api/auth/authenticate', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return userAfterAuth();
}

export async function register(
    firstname: string,
    lastname: string,
    email: string,
    password: string,
): Promise<SessionUser> {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ firstname, lastname, email, password }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return userAfterAuth();
}

async function readMessage(response: Response, fallback: string): Promise<string> {
    const text = (await response.text()).trim();
    if (!text) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(text) as unknown;
        if (typeof parsed === 'string' && parsed.length > 0) {
            return parsed;
        }
    } catch {
        return text;
    }

    return text;
}

export async function requestPasswordReset(email: string): Promise<string> {
    const response = await fetch('/api/user/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return readMessage(
        response,
        'If an account with that email exists, a reset link has been sent.',
    );
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await fetch('/api/user/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return readMessage(response, 'Password reset successfully.');
}

export async function logout(): Promise<void> {
    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw await toApiError(response);
    }
}

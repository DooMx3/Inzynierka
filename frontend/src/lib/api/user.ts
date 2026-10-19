import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type UserUpdate = {
    firstname: string;
    lastname: string | null;
    email: string;
    phoneNumber: string | null;
};

async function readMessage(response: Response, fallback: string): Promise<string> {
    const text = (await response.text()).trim();
    if (!text) {
        return fallback;
    }

    try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed === 'string' && parsed.length > 0) {
            return parsed;
        }
    } catch {
        return text;
    }

    return text;
}

export async function updateUser(profile: UserUpdate): Promise<void> {
    const response = await fetch('/api/user', {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify(profile),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<string> {
    const response = await fetch('/api/user/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ oldPassword, newPassword }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return readMessage(response, 'Password changed successfully.');
}

export async function deactivateAccount(password: string): Promise<string> {
    const response = await fetch('/api/user/deactivate', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    return readMessage(response, 'Account deactivated.');
}

import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type UserPatch = {
    email?: string;
    phoneNumber?: string;
};

const readMessage = async (response: Response, fallback: string): Promise<string> => {
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
};

export const updateUser = async (profile: UserPatch): Promise<void> => {
    const response = await fetch('/api/user/patch', {
        method: 'PATCH',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify(profile),
    });

    if (!response.ok) {
        throw await toApiError(response);
    }
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<string> => {
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
};

export const deactivateAccount = async (password: string): Promise<string> => {
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
};

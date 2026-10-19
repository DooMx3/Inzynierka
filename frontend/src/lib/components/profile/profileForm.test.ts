import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import ProfileForm from './profileForm.svelte';

const readyPassword = 'Superextrasecurepassword1!';

const userInfo = {
    active: true,
    email: 'jane.doe@example.com',
    firstname: 'Jane',
    id: 'user-1',
    lastname: 'Doe',
    membershipStatus: 'MEMBER',
    phoneNumber: '987654332',
    roles: ['USER'],
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('Profile form', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];
    let alerts: string[];

    beforeEach(() => {
        calls = [];
        alerts = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/profile' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/info') {
                return jsonResponse(userInfo);
            }
            if (url === '/api/user' && init?.method === 'PUT') {
                return new Response('', { status: 200 });
            }
            if (url === '/api/user/change-password') {
                return new Response(JSON.stringify('Password changed successfully.'), { status: 200 });
            }
            if (url === '/api/user/deactivate') {
                return new Response(JSON.stringify('Account deactivated.'), { status: 200 });
            }
            if (url === '/api/auth/logout') {
                return new Response('', { status: 200 });
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        globalThis.alert = originalAlert;
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    const shown = async () => {
        render(ProfileForm);
        await waitFor(() => {
            expect(screen.getByText('Jane')).toBeInTheDocument();
        });
    };

    it('shows the profile fields with an edit control and no page-level save bar', async () => {
        await shown();

        expect(screen.getByText('Doe')).toBeInTheDocument();
        expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('987654332')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit First name' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('turns a field into an input from the label or the edit button', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'First name' }));
        expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Jane');

        await fireEvent.click(screen.getByRole('button', { name: 'Cancel First name' }));
        expect(screen.queryByRole('textbox', { name: 'First name' })).not.toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit E-mail' }));
        expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveValue('jane.doe@example.com');
    });

    it('saves the edited field on enter and leaves the other fields unchanged', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit First name' }));
        const input = screen.getByRole('textbox', { name: 'First name' });
        await fireEvent.input(input, { target: { value: 'Janet' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText('Janet')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user' && call.init?.method === 'PUT');
        expect(update?.init?.body).toBe(
            JSON.stringify({
                firstname: 'Janet',
                lastname: 'Doe',
                email: 'jane.doe@example.com',
                phoneNumber: '987654332',
            }),
        );
        expect(screen.queryByRole('textbox', { name: 'First name' })).not.toBeInTheDocument();
    });

    it('saves from the icon button and clears a phone number', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit Phone' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'Phone' }), {
            target: { value: '   ' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Save Phone' }));

        await waitFor(() => {
            expect(screen.getByText('Not set')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user' && call.init?.method === 'PUT');
        expect(update?.init?.body).toBe(
            JSON.stringify({
                firstname: 'Jane',
                lastname: 'Doe',
                email: 'jane.doe@example.com',
                phoneNumber: null,
            }),
        );
    });

    it('cancels an edit without calling the server', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit Last name' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'Last name' }), {
            target: { value: 'Smith' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel Last name' }));

        expect(screen.getByText('Doe')).toBeInTheDocument();
        expect(calls.some((call) => call.init?.method === 'PUT')).toBe(false);
    });

    it('keeps an invalid email in the editor', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit E-mail' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'E-mail' }), {
            target: { value: 'not-an-email' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Save E-mail' }));
        flushSync();

        expect(alerts[0]).toContain('Enter a valid email.');
        expect(screen.getByRole('textbox', { name: 'E-mail' })).toBeInTheDocument();
        expect(calls.some((call) => call.init?.method === 'PUT')).toBe(false);
    });

    it('posts the current and new password', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

        await fireEvent.input(screen.getByLabelText('Current password'), {
            target: { value: 'old-password' },
        });
        await fireEvent.input(screen.getByLabelText('New password'), {
            target: { value: readyPassword },
        });
        await fireEvent.input(screen.getByLabelText('Confirm password'), {
            target: { value: readyPassword },
        });
        flushSync();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

        await waitFor(() => {
            expect(screen.getByText('Password changed successfully.')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user/change-password');
        expect(update?.init?.method).toBe('POST');
        expect(update?.init?.body).toBe(
            JSON.stringify({
                oldPassword: 'old-password',
                newPassword: readyPassword,
            }),
        );
    });

    it('returns to the profile fields from the password and delete forms', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByText('Jane')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        expect(screen.getByText('Delete your account.')).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByText('Jane')).toBeInTheDocument();
    });

    it('returns to the profile fields after the password has changed', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        await fireEvent.input(screen.getByLabelText('Current password'), {
            target: { value: 'old-password' },
        });
        await fireEvent.input(screen.getByLabelText('New password'), {
            target: { value: readyPassword },
        });
        await fireEvent.input(screen.getByLabelText('Confirm password'), {
            target: { value: readyPassword },
        });
        flushSync();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

        await waitFor(() => {
            expect(screen.getByText('Password changed successfully.')).toBeInTheDocument();
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Back to profile' }));
        expect(screen.getByText('Jane')).toBeInTheDocument();
    });

    it('closes an unchanged field without calling the server', async () => {
        await shown();
        const infoCalls = () => calls.filter((call) => call.url === '/api/user/info').length;

        await fireEvent.click(screen.getByRole('button', { name: 'Edit First name' }));
        const input = screen.getByRole('textbox', { name: 'First name' });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(screen.queryByRole('textbox', { name: 'First name' })).not.toBeInTheDocument();
        expect(calls.some((call) => call.init?.method === 'PUT')).toBe(false);
        expect(infoCalls()).toBe(1);
    });

    it('reloads the session after a saved change', async () => {
        await shown();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit Last name' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'Last name' }), {
            target: { value: '   ' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Save Last name' }));

        await waitFor(() => {
            expect(screen.getByText('Not set')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user' && call.init?.method === 'PUT');
        expect(update?.init?.body).toBe(
            JSON.stringify({
                firstname: 'Jane',
                lastname: null,
                email: 'jane.doe@example.com',
                phoneNumber: '987654332',
            }),
        );
        expect(calls.filter((call) => call.url === '/api/user/info').length).toBeGreaterThan(1);
    });

    it('keeps a failed save in the editor', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/info') {
                return jsonResponse(userInfo);
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;

        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit First name' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'First name' }), {
            target: { value: 'Janet' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Save First name' }));

        await waitFor(() => {
            expect(alerts[0]).toBe('missing');
        });
        expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Janet');
    });

    it('refuses an empty first name', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit First name' }));
        await fireEvent.input(screen.getByRole('textbox', { name: 'First name' }), {
            target: { value: '   ' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Save First name' }));
        flushSync();

        expect(alerts[0]).toBe('Enter your first name.');
        expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
        expect(calls.some((call) => call.init?.method === 'PUT')).toBe(false);
    });

    it('shows an error when the profile cannot be loaded', async () => {
        globalThis.fetch = (async () => new Response('missing', { status: 500 })) as typeof fetch;

        render(ProfileForm);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch user info')).toBeInTheDocument();
        });
        expect(screen.queryByRole('button', { name: 'Change password' })).not.toBeInTheDocument();
    });

    it('shows Not set for an empty last name and phone', async () => {
        globalThis.fetch = (async () =>
            jsonResponse({ ...userInfo, lastname: null, phoneNumber: null })) as typeof fetch;

        render(ProfileForm);

        await waitFor(() => {
            expect(screen.getAllByText('Not set')).toHaveLength(2);
        });
    });

    it('deactivates the account and leaves for the sign-in page', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        await fireEvent.input(screen.getByLabelText('Password'), {
            target: { value: 'old-password' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/auth');
        });

        const update = calls.find((call) => call.url === '/api/user/deactivate');
        expect(update?.init?.body).toBe(JSON.stringify({ password: 'old-password' }));
        expect(calls.some((call) => call.url === '/api/auth/logout')).toBe(true);
    });
});

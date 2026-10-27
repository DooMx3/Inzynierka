import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
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
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
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
            if (url === '/api/user/patch' && init?.method === 'PATCH') {
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

    it('shows the account fields and keeps the name read-only', async () => {
        await shown();

        expect(screen.getByText('Doe')).toBeInTheDocument();
        expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('987654332')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit First name' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit E-mail' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit Phone' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    });

    it('patches the email from a popup and asks to sign in again', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit E-mail' }));

        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.glass')).toBeInTheDocument();
        await fireEvent.input(within(dialog).getByRole('textbox', { name: 'E-mail' }), {
            target: { value: 'jane.new@example.com' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

        await waitFor(() => {
            expect(screen.getByText(/Sign in again with the new address/i)).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user/patch');
        expect(update?.init?.method).toBe('PATCH');
        expect(update?.init?.body).toBe(JSON.stringify({ email: 'jane.new@example.com' }));

        await fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
        await waitFor(() => {
            expect(window.location.href).toBe('/auth');
        });
        expect(calls.some((call) => call.url === '/api/auth/logout')).toBe(true);
    });

    it('keeps an invalid email in the popup', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit E-mail' }));
        const dialog = screen.getByRole('dialog');
        await fireEvent.input(within(dialog).getByRole('textbox', { name: 'E-mail' }), {
            target: { value: 'not-an-email' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
        flushSync();

        expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a valid email.');
        expect(calls.some((call) => call.init?.method === 'PATCH')).toBe(false);
    });

    it('patches the phone number and confirms without signing out', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit Phone' }));
        const dialog = screen.getByRole('dialog');
        await fireEvent.input(within(dialog).getByRole('textbox', { name: 'Phone' }), {
            target: { value: '123456789' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

        await waitFor(() => {
            expect(screen.getByText('Your phone number has been updated.')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user/patch');
        expect(update?.init?.body).toBe(JSON.stringify({ phoneNumber: '123456789' }));
        expect(calls.filter((call) => call.url === '/api/user/info').length).toBeGreaterThan(1);
        expect(calls.some((call) => call.url === '/api/auth/logout')).toBe(false);
    });

    it('closes an unchanged phone popup without calling the server', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit Phone' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(calls.some((call) => call.init?.method === 'PATCH')).toBe(false);
    });

    it('posts the current and new password from the popup', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        const dialog = screen.getByRole('dialog');

        await fireEvent.input(within(dialog).getByLabelText('Current password'), {
            target: { value: 'old-password' },
        });
        await fireEvent.input(within(dialog).getByLabelText('New password'), {
            target: { value: readyPassword },
        });
        await fireEvent.input(within(dialog).getByLabelText('Confirm password'), {
            target: { value: readyPassword },
        });
        flushSync();
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Change password' }));

        await waitFor(() => {
            expect(within(dialog).getByText('Password changed successfully.')).toBeInTheDocument();
        });

        const update = calls.find((call) => call.url === '/api/user/change-password');
        expect(update?.init?.method).toBe('POST');
        expect(update?.init?.body).toBe(
            JSON.stringify({
                oldPassword: 'old-password',
                newPassword: readyPassword,
            }),
        );

        await fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in again' }));
        await waitFor(() => {
            expect(window.location.href).toBe('/auth');
        });
    });

    it('returns to the profile fields from the password and delete popups', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        expect(screen.getByText('Delete your account.')).toBeInTheDocument();
        await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
        const dialog = screen.getByRole('dialog');
        await fireEvent.input(within(dialog).getByLabelText('Password'), {
            target: { value: 'old-password' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/auth');
        });

        const update = calls.find((call) => call.url === '/api/user/deactivate');
        expect(update?.init?.body).toBe(JSON.stringify({ password: 'old-password' }));
        expect(calls.some((call) => call.url === '/api/auth/logout')).toBe(true);
    });
});

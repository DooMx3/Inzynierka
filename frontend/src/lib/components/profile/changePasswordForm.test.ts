import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { flushSync } from 'svelte';
import ChangePasswordForm from './changePasswordForm.svelte';

const readyPassword = 'Superextrasecurepassword1!';

const fill = async (current: string, password: string, confirm: string) => {
    await fireEvent.input(screen.getByLabelText('Current password'), { target: { value: current } });
    await fireEvent.input(screen.getByLabelText('New password'), { target: { value: password } });
    await fireEvent.input(screen.getByLabelText('Confirm password'), { target: { value: confirm } });
    flushSync();
};

describe('Change password form', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    let alerts: string[];
    let calls: number;

    beforeEach(() => {
        alerts = [];
        calls = 0;
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(JSON.stringify('Password changed successfully.'), { status: 200 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        globalThis.alert = originalAlert;
    });

    it('asks for the current password and a matching new one', () => {
        render(ChangePasswordForm);

        expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'password');
        expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
        expect(screen.getByText('At least 16 characters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change password' })).toHaveAttribute('type', 'submit');
    });

    it('refuses an empty current password before calling the server', async () => {
        render(ChangePasswordForm);
        await fill('', readyPassword, readyPassword);
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        flushSync();

        expect(calls).toBe(0);
        expect(alerts[0]).toContain('Enter your current password.');
        expect(screen.getByLabelText('Current password').parentElement).toHaveClass('border-red-500');
    });

    it('refuses a new password that is not ready', async () => {
        render(ChangePasswordForm);
        await fill('old-password', 'Abcdef1!', 'Abcdef1!');
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        flushSync();

        expect(calls).toBe(0);
        expect(alerts[0]).toContain('Password does not meet the requirements.');
        expect(screen.getByLabelText('New password').parentElement).toHaveClass('border-red-500');
    });

    it('marks the confirm field when the passwords differ', async () => {
        render(ChangePasswordForm);
        await fill('old-password', readyPassword, `${readyPassword}x`);
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        flushSync();

        expect(calls).toBe(0);
        expect(alerts[0]).toContain('Passwords do not match.');
        expect(screen.getByLabelText('Confirm password').parentElement).toHaveClass('border-red-500');
    });

    it('shows the server error and keeps the form open', async () => {
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(JSON.stringify({ error: 'Current password is wrong' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;

        render(ChangePasswordForm);
        await fill('old-password', readyPassword, readyPassword);
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

        await waitFor(() => {
            expect(alerts[0]).toBe('Current password is wrong');
        });
        expect(screen.getByLabelText('New password')).toBeInTheDocument();
        expect(calls).toBe(1);
    });

    it('returns through cancel without calling the server', async () => {
        let cancelled = false;
        render(ChangePasswordForm, { onCancel: () => (cancelled = true) });

        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(cancelled).toBe(true);
        expect(calls).toBe(0);
    });

    it('alerts on success and finishes so the user can sign in again', async () => {
        let finished = false;
        render(ChangePasswordForm, { onFinished: () => (finished = true) });
        await fill('old-password', readyPassword, readyPassword);
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

        await waitFor(() => {
            expect(alerts[0]).toBe('Password changed successfully.');
        });
        expect(finished).toBe(true);
        expect(calls).toBe(1);
    });
});

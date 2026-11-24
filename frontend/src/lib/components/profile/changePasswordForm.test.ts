import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { flushSync } from 'svelte';
import { gooeyToast } from 'goey-toast-svelte';
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
    let calls: number;
    let warningSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'warning'>>;
    let errorSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'error'>>;
    let successSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'success'>>;

    beforeEach(() => {
        calls = 0;
        warningSpy = spyOn(gooeyToast, 'warning');
        errorSpy = spyOn(gooeyToast, 'error');
        successSpy = spyOn(gooeyToast, 'success');
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(JSON.stringify('Password changed successfully.'), { status: 200 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        warningSpy.mockRestore();
        errorSpy.mockRestore();
        successSpy.mockRestore();
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
        expect(warningSpy).toHaveBeenCalledWith(
            'Check password fields',
            expect.objectContaining({
                description: expect.stringContaining('Enter your current password.'),
            }),
        );
        expect(screen.getByLabelText('Current password').parentElement).toHaveClass('border-red-500');
    });

    it('refuses a new password that is not ready', async () => {
        render(ChangePasswordForm);
        await fill('old-password', 'Abcdef1!', 'Abcdef1!');
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        flushSync();

        expect(calls).toBe(0);
        expect(warningSpy).toHaveBeenCalledWith(
            'Check password fields',
            expect.objectContaining({
                description: expect.stringContaining('Password does not meet the requirements.'),
            }),
        );
        expect(screen.getByLabelText('New password').parentElement).toHaveClass('border-red-500');
    });

    it('marks the confirm field when the passwords differ', async () => {
        render(ChangePasswordForm);
        await fill('old-password', readyPassword, `${readyPassword}x`);
        await fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        flushSync();

        expect(calls).toBe(0);
        expect(warningSpy).toHaveBeenCalledWith(
            'Check password fields',
            expect.objectContaining({
                description: expect.stringContaining('Passwords do not match.'),
            }),
        );
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
            expect(errorSpy).toHaveBeenCalledWith('Password change failed', {
                description: 'Current password is wrong',
            });
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
            expect(successSpy).toHaveBeenCalledWith('Password changed', {
                description: 'Password changed successfully.',
            });
        });
        expect(finished).toBe(true);
        expect(calls).toBe(1);
    });
});

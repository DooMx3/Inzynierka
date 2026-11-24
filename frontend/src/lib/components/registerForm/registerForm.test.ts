import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { flushSync } from 'svelte';
import { gooeyToast } from 'goey-toast-svelte';
import RegisterForm from './registerForm.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

const readyPassword = 'Superextrasecurepassword1!';

const fillReadyAccount = async (confirmPassword = readyPassword) => {
    await fireEvent.input(screen.getByLabelText('Firstname'), { target: { value: 'Jan' } });
    await fireEvent.input(screen.getByLabelText('Lastname'), { target: { value: 'Kowalski' } });
    await fireEvent.input(screen.getByLabelText('Email'), {
        target: { value: 'jan.kowalski@example.com' },
    });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: readyPassword } });
    await fireEvent.input(screen.getByLabelText('Confirm Password'), {
        target: { value: confirmPassword },
    });
    flushSync();
};

describe('Register form', () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;
    let warningSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'warning'>>;
    let errorSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'error'>>;

    beforeEach(() => {
        setUser(null);
        warningSpy = spyOn(gooeyToast, 'warning');
        errorSpy = spyOn(gooeyToast, 'error');
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/auth' },
        });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        warningSpy.mockRestore();
        errorSpy.mockRestore();
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
        setUser(null);
    });

    it('keeps the registration fields and a login switch', () => {
        render(RegisterForm);

        expect(screen.getByLabelText('Firstname')).toBeInTheDocument();
        expect(screen.getByLabelText('Lastname')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
        expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('type', 'password');
        expect(screen.getByText('At least 16 characters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create free account' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'sign in' })).toHaveAttribute('type', 'button');
    });

    it('switches to login from the button under the form', async () => {
        let switched = false;
        render(RegisterForm, { onSwitchToLogin: () => { switched = true; } });

        await fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

        expect(switched).toBe(true);
    });

    it('refuses a password that is not ready for the backend', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(RegisterForm);
        await fillReadyAccount('Abcdef1!');
        await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'Abcdef1!' } });
        flushSync();
        await fireEvent.click(screen.getByRole('button', { name: 'Create free account' }));
        flushSync();

        expect(called).toBe(false);
        expect(warningSpy).toHaveBeenCalledWith(
            'Check registration details',
            expect.objectContaining({
                description: expect.stringContaining('Password does not meet the requirements.'),
            }),
        );
        expect(screen.getByLabelText('Password').parentElement).toHaveClass('border-red-500', 'text-red-700/80');
    });

    it('marks the confirm field when the passwords differ', async () => {
        globalThis.fetch = (async () => new Response('', { status: 500 })) as typeof fetch;

        render(RegisterForm);
        await fillReadyAccount(`${readyPassword}x`);
        await fireEvent.click(screen.getByRole('button', { name: 'Create free account' }));
        flushSync();

        expect(warningSpy).toHaveBeenCalledWith(
            'Check registration details',
            expect.objectContaining({
                description: expect.stringContaining('Passwords do not match.'),
            }),
        );
        expect(screen.getByLabelText('Confirm Password')).toHaveClass('text-red-700/80');
        expect(screen.getByLabelText('Confirm Password').parentElement).toHaveClass('border-red-500');
        expect(session.user).toBeNull();
    });

    it('registers and stores the account when the password is ready', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            if (String(input) === '/api/auth/register') {
                expect(init?.body).toBe(
                    JSON.stringify({
                        firstname: 'Jan',
                        lastname: 'Kowalski',
                        email: 'jan.kowalski@example.com',
                        password: readyPassword,
                    }),
                );
                return new Response('', { status: 200 });
            }
            return new Response(
                JSON.stringify({
                    id: '1',
                    firstname: 'Jan',
                    lastname: 'Kowalski',
                    email: 'jan.kowalski@example.com',
                }),
                { status: 200 },
            );
        }) as typeof fetch;

        render(RegisterForm);
        await fillReadyAccount();
        await fireEvent.click(screen.getByRole('button', { name: 'Create free account' }));

        await waitFor(() => {
            expect(session.user?.email).toBe('jan.kowalski@example.com');
        });
        expect(window.location.href).toBe('/');
        expect(warningSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});

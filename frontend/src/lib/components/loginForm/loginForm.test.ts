import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { flushSync } from 'svelte';
import { gooeyToast } from 'goey-toast-svelte';
import LoginForm from './loginForm.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

const fieldOf = (label: string) => screen.getByLabelText(label).parentElement;

describe('Login form', () => {
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

    it('asks for an email and a password', () => {
        render(LoginForm);

        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: 'Login' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'Forgot password?' })).toHaveAttribute('type', 'button');
        expect(screen.getByRole('button', { name: 'create an account' })).toHaveAttribute('type', 'button');
    });

    it('turns the card over when a flip handler is provided', async () => {
        let flipped = false;
        render(LoginForm, {
            onForgotPassword: () => {
                flipped = true;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

        expect(flipped).toBe(true);
        expect(window.location.href).toBe('http://localhost/auth');
    });

    it('switches to registration from the button under the form', async () => {
        let switched = false;
        render(LoginForm, { onSwitchToRegister: () => { switched = true; } });

        await fireEvent.click(screen.getByRole('button', { name: 'create an account' }));

        expect(switched).toBe(true);
    });

    it('marks invalid fields and alerts without calling the server', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(LoginForm);
        await fireEvent.click(screen.getByRole('button', { name: 'Login' }));
        flushSync();

        expect(called).toBe(false);
        expect(warningSpy).toHaveBeenCalledTimes(1);
        const warningOptions = warningSpy.mock.calls[0]?.[1];
        expect(warningOptions?.description).toContain('Enter a valid email.');
        expect(warningOptions?.description).toContain('Enter your password.');
        expect(fieldOf('Email')).toHaveClass('border-red-500', 'text-red-700/80');
        expect(fieldOf('Password')).toHaveClass('border-red-500');
        expect(screen.getByLabelText('Password')).toHaveClass('text-red-700/80');
    });

    it('marks both fields and alerts when the server rejects the password', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })) as typeof fetch;

        render(LoginForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.input(screen.getByLabelText('Password'), {
            target: { value: 'wrong-password' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalledWith('Login failed', {
                description: 'Invalid credentials',
            });
        });
        expect(fieldOf('Email')).toHaveClass('border-red-500');
        expect(fieldOf('Password')).toHaveClass('border-red-500', 'text-red-700/80');
        expect(session.user).toBeNull();
    });

    it('stores the user and leaves the auth page after a successful login', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            if (String(input) === '/api/user/info') {
                return new Response(
                    JSON.stringify({
                        id: '1',
                        firstname: 'Jan',
                        email: 'jan.kowalski@example.com',
                    }),
                    { status: 200 },
                );
            }
            return new Response('', { status: 200 });
        }) as typeof fetch;

        render(LoginForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.input(screen.getByLabelText('Password'), {
            target: { value: 'Superextrasecurepassword1!' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(session.user?.firstname).toBe('Jan');
        });
        expect(window.location.href).toBe('/');
        expect(warningSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('redirects to a safe internal redirectTo path and falls back to / for unsafe URLs', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            if (String(input) === '/api/user/info') {
                return new Response(
                    JSON.stringify({
                        id: '1',
                        firstname: 'Jan',
                        email: 'jan.kowalski@example.com',
                    }),
                    { status: 200 },
                );
            }
            return new Response('', { status: 200 });
        }) as typeof fetch;

        window.location.href = 'http://localhost/auth?redirectTo=%2Fqr%2Fequipment%2Feq-42';

        const firstRender = render(LoginForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.input(screen.getByLabelText('Password'), {
            target: { value: 'Superextrasecurepassword1!' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/qr/equipment/eq-42');
        });

        firstRender.unmount();
        setUser(null);
        window.location.href = 'http://localhost/auth?redirectTo=https%3A%2F%2Fevil.com';

        render(LoginForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.input(screen.getByLabelText('Password'), {
            target: { value: 'Superextrasecurepassword1!' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/');
        });
        expect(warningSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});

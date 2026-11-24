import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { flushSync } from 'svelte';
import { gooeyToast } from 'goey-toast-svelte';
import ForgotPasswordForm from './forgotPasswordForm.svelte';

describe('Forgot password form', () => {
    const originalFetch = globalThis.fetch;
    let warningSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'warning'>>;
    let errorSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'error'>>;
    let infoSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'info'>>;

    beforeEach(() => {
        warningSpy = spyOn(gooeyToast, 'warning');
        errorSpy = spyOn(gooeyToast, 'error');
        infoSpy = spyOn(gooeyToast, 'info');
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        warningSpy.mockRestore();
        errorSpy.mockRestore();
        infoSpy.mockRestore();
    });

    it('asks for an email and a way back to sign in', () => {
        render(ForgotPasswordForm);

        expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
        expect(screen.getByRole('button', { name: 'Send reset link' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'sign in' })).toHaveAttribute('type', 'button');
    });

    it('flips back to sign in when the card provides a handler', async () => {
        let flippedBack = false;
        render(ForgotPasswordForm, {
            onBackToSignIn: () => {
                flippedBack = true;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

        expect(flippedBack).toBe(true);
    });

    it('refuses an invalid email without calling the server', async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response('', { status: 500 });
        }) as typeof fetch;

        render(ForgotPasswordForm);
        await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
        flushSync();

        expect(called).toBe(false);
        expect(warningSpy).toHaveBeenCalledWith(
            'Invalid email',
            expect.objectContaining({
                description: expect.stringContaining('Enter a valid email.'),
            }),
        );
        expect(screen.getByLabelText('Email').parentElement).toHaveClass('border-red-500');
    });

    it('shows the same confirmation after the request is accepted', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            expect(String(input)).toBe('/api/user/forgot-password');
            expect(init?.body).toBe(JSON.stringify({ email: 'jan.kowalski@example.com' }));
            return new Response(
                'If an account with that email exists, a reset link has been sent.',
                { status: 200 },
            );
        }) as typeof fetch;

        render(ForgotPasswordForm);
        await fireEvent.input(screen.getByLabelText('Email'), {
            target: { value: 'jan.kowalski@example.com' },
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

        await waitFor(() => {
            expect(
                screen.getByText('If an account with that email exists, a reset link has been sent.'),
            ).toBeInTheDocument();
        });
        expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
        expect(infoSpy).toHaveBeenCalledWith('Reset link requested', {
            description: 'If an account with that email exists, a reset link has been sent.',
        });
        expect(warningSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});

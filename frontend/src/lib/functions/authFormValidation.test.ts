import { describe, it, expect } from 'bun:test';
import {
    forgotPasswordErrorMessages,
    forgotPasswordInvalidFields,
    isValidEmail,
    loginErrorMessages,
    loginInvalidFields,
    registerErrorMessages,
    registerInvalidFields,
    resetPasswordErrorMessages,
    resetPasswordInvalidFields,
    changePasswordErrorMessages,
    changePasswordInvalidFields,
} from './authFormValidation';

const readyPassword = 'Superextrasecurepassword1!';

describe('Auth form validation', () => {
    it('accepts a normal email address', () => {
        expect(isValidEmail('jan.kowalski@example.com')).toBe(true);
    });

    it('rejects an email without a domain', () => {
        expect(isValidEmail('jan.kowalski')).toBe(false);
    });

    it('marks empty login fields', () => {
        expect(loginInvalidFields('', '')).toEqual({ email: true, password: true });
        expect(loginErrorMessages('not-an-email', '')).toEqual([
            'Enter a valid email.',
            'Enter your password.',
        ]);
    });

    it('accepts a complete login form', () => {
        expect(loginInvalidFields('jan.kowalski@example.com', 'secret')).toEqual({
            email: false,
            password: false,
        });
        expect(loginErrorMessages('jan.kowalski@example.com', 'secret')).toEqual([]);
    });

    it('marks a registration password that cannot be sent to the backend', () => {
        const input = {
            username: 'Jan',
            lastname: 'Kowalski',
            email: 'jan.kowalski@example.com',
            password: 'Abcdef1!',
            confirmPassword: 'Abcdef1!',
        };
        const fields = registerInvalidFields(input);

        expect(fields.password).toBe(true);
        expect(fields.confirmPassword).toBe(false);
        expect(registerErrorMessages(input)).toContain('Password does not meet the requirements.');
    });

    it('marks mismatched passwords', () => {
        const fields = registerInvalidFields({
            username: 'Jan',
            lastname: 'Kowalski',
            email: 'jan.kowalski@example.com',
            password: readyPassword,
            confirmPassword: `${readyPassword}x`,
        });

        expect(fields.password).toBe(false);
        expect(fields.confirmPassword).toBe(true);
    });

    it('accepts a registration payload the backend can store', () => {
        const input = {
            username: 'Jan',
            lastname: 'Kowalski',
            email: 'jan.kowalski@example.com',
            password: readyPassword,
            confirmPassword: readyPassword,
        };

        expect(registerInvalidFields(input)).toEqual({
            username: false,
            lastname: false,
            email: false,
            password: false,
            confirmPassword: false,
        });
        expect(registerErrorMessages(input)).toEqual([]);
    });

    it('marks an invalid email on the forgot-password form', () => {
        expect(forgotPasswordInvalidFields('not-an-email')).toEqual({ email: true });
        expect(forgotPasswordErrorMessages('not-an-email')).toEqual(['Enter a valid email.']);
        expect(forgotPasswordInvalidFields('jan.kowalski@example.com')).toEqual({ email: false });
    });

    it('refuses a reset until both passwords match and meet the rules', () => {
        expect(resetPasswordInvalidFields({
            password: 'Abcdef1!',
            confirmPassword: 'Abcdef1!',
        }).password).toBe(true);

        expect(resetPasswordInvalidFields({
            password: readyPassword,
            confirmPassword: `${readyPassword}x`,
        })).toEqual({
            password: false,
            confirmPassword: true,
        });
        expect(resetPasswordErrorMessages({
            password: readyPassword,
            confirmPassword: `${readyPassword}x`,
        })).toEqual(['Passwords do not match.']);

        expect(resetPasswordInvalidFields({
            password: readyPassword,
            confirmPassword: readyPassword,
        })).toEqual({
            password: false,
            confirmPassword: false,
        });
    });

    it('requires the current password before a change', () => {
        expect(changePasswordInvalidFields({
            oldPassword: '',
            password: readyPassword,
            confirmPassword: readyPassword,
        })).toEqual({
            oldPassword: true,
            password: false,
            confirmPassword: false,
        });
        expect(changePasswordErrorMessages({
            oldPassword: '',
            password: readyPassword,
            confirmPassword: readyPassword,
        })).toEqual(['Enter your current password.']);
    });

    it('rejects a new password that misses the rules or the confirmation', () => {
        expect(changePasswordErrorMessages({
            oldPassword: 'current-password',
            password: 'Abcdef1!',
            confirmPassword: 'Abcdef1!',
        })).toEqual(['Password does not meet the requirements.']);

        expect(changePasswordInvalidFields({
            oldPassword: 'current-password',
            password: readyPassword,
            confirmPassword: `${readyPassword}x`,
        })).toEqual({
            oldPassword: false,
            password: false,
            confirmPassword: true,
        });
        expect(changePasswordErrorMessages({
            oldPassword: 'current-password',
            password: readyPassword,
            confirmPassword: `${readyPassword}x`,
        })).toEqual(['Passwords do not match.']);
    });

    it('accepts a complete password change', () => {
        const input = {
            oldPassword: 'current-password',
            password: readyPassword,
            confirmPassword: readyPassword,
        };

        expect(changePasswordInvalidFields(input)).toEqual({
            oldPassword: false,
            password: false,
            confirmPassword: false,
        });
        expect(changePasswordErrorMessages(input)).toEqual([]);
    });
});

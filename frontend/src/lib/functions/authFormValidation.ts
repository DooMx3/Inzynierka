import { isPasswordReadyForRegistration } from './passwordConditionsChecker';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

export type LoginInvalidFields = {
    email: boolean;
    password: boolean;
};

export type RegisterInvalidFields = {
    username: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
};

export const loginInvalidFields = (email: string, password: string): LoginInvalidFields => ({
    email: !isValidEmail(email),
    password: password.length === 0,
});

export const loginErrorMessages = (email: string, password: string) => {
    const fields = loginInvalidFields(email, password);
    const messages: string[] = [];

    if (fields.email) {
        messages.push('Enter a valid email.');
    }
    if (fields.password) {
        messages.push('Enter your password.');
    }

    return messages;
};

export const registerInvalidFields = (input: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}): RegisterInvalidFields => ({
    username: input.username.trim().length === 0,
    email: !isValidEmail(input.email),
    password: !isPasswordReadyForRegistration(input.password),
    confirmPassword: input.password !== input.confirmPassword,
});

export const registerErrorMessages = (input: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}) => {
    const fields = registerInvalidFields(input);
    const messages: string[] = [];

    if (fields.username) {
        messages.push('Enter your username.');
    }
    if (fields.email) {
        messages.push('Enter a valid email.');
    }
    if (fields.password) {
        messages.push('Password does not meet the requirements.');
    }
    if (fields.confirmPassword) {
        messages.push('Passwords do not match.');
    }

    return messages;
};

export type ForgotPasswordInvalidFields = {
    email: boolean;
};

export const forgotPasswordInvalidFields = (email: string): ForgotPasswordInvalidFields => ({
    email: !isValidEmail(email),
});

export const forgotPasswordErrorMessages = (email: string) => {
    const fields = forgotPasswordInvalidFields(email);
    const messages: string[] = [];

    if (fields.email) {
        messages.push('Enter a valid email.');
    }

    return messages;
};

export type ResetPasswordInvalidFields = {
    password: boolean;
    confirmPassword: boolean;
};

export const resetPasswordInvalidFields = (input: {
    password: string;
    confirmPassword: string;
}): ResetPasswordInvalidFields => ({
    password: !isPasswordReadyForRegistration(input.password),
    confirmPassword: input.password !== input.confirmPassword,
});

export const resetPasswordErrorMessages = (input: {
    password: string;
    confirmPassword: string;
}) => {
    const fields = resetPasswordInvalidFields(input);
    const messages: string[] = [];

    if (fields.password) {
        messages.push('Password does not meet the requirements.');
    }
    if (fields.confirmPassword) {
        messages.push('Passwords do not match.');
    }

    return messages;
};

export type ChangePasswordInvalidFields = {
    oldPassword: boolean;
    password: boolean;
    confirmPassword: boolean;
};

export const changePasswordInvalidFields = (input: {
    oldPassword: string;
    password: string;
    confirmPassword: string;
}): ChangePasswordInvalidFields => ({
    oldPassword: input.oldPassword.length === 0,
    ...resetPasswordInvalidFields(input),
});

export const changePasswordErrorMessages = (input: {
    oldPassword: string;
    password: string;
    confirmPassword: string;
}) => {
    const fields = changePasswordInvalidFields(input);
    const messages: string[] = [];

    if (fields.oldPassword) {
        messages.push('Enter your current password.');
    }
    if (fields.password) {
        messages.push('Password does not meet the requirements.');
    }
    if (fields.confirmPassword) {
        messages.push('Passwords do not match.');
    }

    return messages;
};

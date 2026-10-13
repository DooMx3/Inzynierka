export type PasswordCondition = {
    description: string;
    isValid: (password: string) => boolean;
};

export const passwordConditions: PasswordCondition[] = [
    {
        description: "At least 16 characters",
        isValid: (password) => password.length >= 16,
    },
    {
        description: "At least one uppercase letter",
        isValid: (password) => /[A-Z]/.test(password),
    },
    {
        description: "At least one lowercase letter",
        isValid: (password) => /[a-z]/.test(password),
    },
    {
        description: "At least one number",
        isValid: (password) => /[0-9]/.test(password),
    },
    {
        description: "At least one special character",
        isValid: (password) => /[^A-Za-z0-9]/.test(password),
    },
];

export const checkPasswordConditions = (password: string) => {
    return passwordConditions.map((condition) => ({
        description: condition.description,
        isValid: condition.isValid(password),
    }));
};

export const isPasswordReadyForRegistration = (password: string) => {
    return checkPasswordConditions(password).every((condition) => condition.isValid);
};

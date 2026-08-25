export type PasswordCondition = {
    description: string;
    isValid: (password: string) => boolean;
};

export const passwordConditions: PasswordCondition[] = [
    {
        description: "At least 8 characters long",
        isValid: (password) => password.length >= 8,
    },
    {
        description: "Contains at least one uppercase letter",
        isValid: (password) => /[A-Z]/.test(password),
    },
    {
        description: "Contains at least one lowercase letter",
        isValid: (password) => /[a-z]/.test(password),
    },
    {
        description: "Contains at least one number",
        isValid: (password) => /[0-9]/.test(password),
    },
    {
        description: "Contains at least one special character",
        isValid: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
];

export const checkPasswordConditions = (password: string) => {
    return passwordConditions.map((condition) => ({
        description: condition.description,
        isValid: condition.isValid(password),
    }));
};

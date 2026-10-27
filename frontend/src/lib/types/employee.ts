export type Employee = {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    roles: string[];
    pending: boolean;
};

export const roleLabel = (role: string) => {
    if (role === 'WORKER') {
        return 'Vineyard Worker';
    }
    if (role === 'OENOLOGIST') {
        return 'Oenologist';
    }
    if (role === 'OWNER') {
        return 'Owner';
    }
    return role;
};

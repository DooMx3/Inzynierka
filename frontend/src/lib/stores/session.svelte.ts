import { fetchCurrentUser, type SessionUser } from '$lib/api/auth';

export const session = $state<{ user: SessionUser | null }>({
    user: null,
});

export const setUser = (user: SessionUser | null) => {
    session.user = user;
};

export const displayName = (user: SessionUser) => {
    const name = user.firstname.trim();
    return name.length > 0 ? name : user.email;
};

export const refreshSession = async () => {
    try {
        setUser(await fetchCurrentUser());
    } catch {
        setUser(null);
    }
};

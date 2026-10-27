import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type OrganisationInvitation = {
    organisationId: string;
    organisationName: string;
};

export type OrganisationDraft = {
    name: string;
    city: string;
    taxId?: string;
    street?: string;
    postalCode?: string;
    motto?: string;
};

export type Organisation = {
    id: string;
    name: string;
    city: string;
    taxId: string;
    street: string;
    postalCode: string;
    motto: string;
};

export type OrganisationRole = 'WORKER' | 'OENOLOGIST';

export type OrganisationMember = {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    membershipStatus: string;
    roles: string[];
};

export type PendingInvitation = {
    userId: string;
    email: string;
    firstname: string;
    lastname: string;
};

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const asText = (value: unknown) => (typeof value === 'string' ? value : '');

const readOrganisation = (data: unknown): Organisation => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
        id: asText(record.id),
        name: asText(record.name),
        city: asText(record.city),
        taxId: asText(record.taxId),
        street: asText(record.street),
        postalCode: asText(record.postalCode),
        motto: asText(record.motto),
    };
};

const organisationBody = (draft: OrganisationDraft) =>
    JSON.stringify({
        name: draft.name,
        city: draft.city,
        taxId: draft.taxId || undefined,
        street: draft.street || undefined,
        postalCode: draft.postalCode || undefined,
        motto: draft.motto || undefined,
    });

export const getUserInvitations = async (): Promise<OrganisationInvitation[]> => {
    const response = await fetch('/api/user/invitations', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }

    return data.flatMap((item) => {
        if (!item || typeof item !== 'object') {
            return [];
        }
        const record = item as Record<string, unknown>;
        if (typeof record.organisationId !== 'string' || typeof record.organisationName !== 'string') {
            return [];
        }
        return [
            {
                organisationId: record.organisationId,
                organisationName: record.organisationName,
            },
        ];
    });
};

export const acceptInvitation = async () => {
    const response = await fetch('/api/user/invitations/accept', {
        method: 'POST',
        credentials: 'include',
    });
    await ensureOk(response);
};

export const getOrganisation = async (): Promise<Organisation> => {
    const response = await fetch('/api/organisations', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    return readOrganisation(await response.json());
};

export const createOrganisation = async (draft: OrganisationDraft): Promise<Organisation> => {
    const response = await fetch('/api/organisations', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: organisationBody(draft),
    });
    await ensureOk(response);
    return readOrganisation(await response.json());
};

export const updateOrganisation = async (draft: OrganisationDraft): Promise<Organisation> => {
    const response = await fetch('/api/organisations', {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: organisationBody(draft),
    });
    await ensureOk(response);
    return readOrganisation(await response.json());
};

export const deleteOrganisation = async (password: string) => {
    const response = await fetch('/api/organisations', {
        method: 'DELETE',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ password }),
    });
    await ensureOk(response);
};

export const leaveOrganisation = async () => {
    throw new Error('Leaving a vineyard is not available yet.');
};

export const getOrganisationMembers = async (): Promise<OrganisationMember[]> => {
    const response = await fetch('/api/organisations/members', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }

    return data.flatMap((item) => {
        if (!item || typeof item !== 'object') {
            return [];
        }
        const record = item as Record<string, unknown>;
        if (typeof record.id !== 'string' || typeof record.email !== 'string') {
            return [];
        }
        const roles = Array.isArray(record.roles)
            ? record.roles.filter((role): role is string => typeof role === 'string')
            : [];
        return [
            {
                id: record.id,
                firstname: asText(record.firstname),
                lastname: asText(record.lastname),
                email: record.email,
                phoneNumber: typeof record.phoneNumber === 'string' ? record.phoneNumber : null,
                membershipStatus: asText(record.membershipStatus),
                roles,
            },
        ];
    });
};

export const getPendingInvitations = async (): Promise<PendingInvitation[]> => {
    const response = await fetch('/api/organisations/invitations', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }

    return data.flatMap((item) => {
        if (!item || typeof item !== 'object') {
            return [];
        }
        const record = item as Record<string, unknown>;
        if (typeof record.userId !== 'string' || typeof record.email !== 'string') {
            return [];
        }
        return [
            {
                userId: record.userId,
                email: record.email,
                firstname: asText(record.firstname),
                lastname: asText(record.lastname),
            },
        ];
    });
};

export const inviteEmployee = async (email: string) => {
    const response = await fetch('/api/organisations/invitations', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: JSON.stringify({ email }),
    });
    await ensureOk(response);
};

export const cancelInvitation = async (userId: string) => {
    const response = await fetch(`/api/organisations/invitations/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

export const addOrganisationRole = async (userId: string, role: OrganisationRole) => {
    const response = await fetch(
        `/api/organisations/users/${userId}/roles?role=${encodeURIComponent(role)}`,
        {
            method: 'POST',
            credentials: 'include',
        },
    );
    await ensureOk(response);
};

export const removeOrganisationRole = async (userId: string, role: OrganisationRole) => {
    const response = await fetch(
        `/api/organisations/users/${userId}/roles?role=${encodeURIComponent(role)}`,
        {
            method: 'DELETE',
            credentials: 'include',
        },
    );
    await ensureOk(response);
};

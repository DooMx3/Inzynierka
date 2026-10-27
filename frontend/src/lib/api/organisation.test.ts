import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ApiError } from './auth';
import {
    acceptInvitation,
    addOrganisationRole,
    cancelInvitation,
    createOrganisation,
    deleteOrganisation,
    getOrganisation,
    getOrganisationMembers,
    getPendingInvitations,
    getUserInvitations,
    inviteEmployee,
    leaveOrganisation,
    removeOrganisationRole,
    updateOrganisation,
} from './organisation';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('Organisation API', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        calls = [];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    const capture = (response: Response) => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return response;
        }) as typeof fetch;
    };

    it('reads the current user invitations and skips incomplete records', async () => {
        capture(
            json([
                { organisationId: 'org-1', organisationName: 'North vineyard' },
                { organisationName: 'Missing id' },
                null,
            ]),
        );

        const invitations = await getUserInvitations();

        expect(invitations).toEqual([{ organisationId: 'org-1', organisationName: 'North vineyard' }]);
        expect(calls[0]?.url).toBe('/api/user/invitations');
        expect(calls[0]?.init?.method).toBe('GET');
        expect(calls[0]?.init?.credentials).toBe('include');
    });

    it('returns no invitations when the payload is not a list', async () => {
        capture(json({ organisationId: 'org-1' }));

        expect(await getUserInvitations()).toEqual([]);
    });

    it('accepts an invitation with an empty body', async () => {
        capture(new Response('', { status: 204 }));

        await acceptInvitation();

        expect(calls[0]?.url).toBe('/api/user/invitations/accept');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.credentials).toBe('include');
    });

    it('loads the current organisation and fills missing text with empty strings', async () => {
        capture(json({ id: 'org-1', name: 'Winnica Anna', city: 'Sandomierz' }));

        expect(await getOrganisation()).toEqual({
            id: 'org-1',
            name: 'Winnica Anna',
            city: 'Sandomierz',
            taxId: '',
            street: '',
            postalCode: '',
            motto: '',
        });
        expect(calls[0]?.url).toBe('/api/organisations');
        expect(calls[0]?.init?.method).toBe('GET');
    });

    it('creates an organisation and omits blank optional fields', async () => {
        capture(json({ id: 'org-1', name: 'North vineyard', city: 'Sandomierz' }));

        const created = await createOrganisation({
            name: 'North vineyard',
            city: 'Sandomierz',
            street: '',
            postalCode: '27-600',
            taxId: '',
            motto: '',
        });

        expect(created.name).toBe('North vineyard');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.headers).toEqual({ 'Content-Type': 'application/json' });
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                name: 'North vineyard',
                city: 'Sandomierz',
                postalCode: '27-600',
            }),
        );
    });

    it('updates an organisation with PUT', async () => {
        capture(json({ id: 'org-1', name: 'Winnica Nowa', city: 'Sandomierz', motto: 'Sun' }));

        const updated = await updateOrganisation({
            name: 'Winnica Nowa',
            city: 'Sandomierz',
            motto: 'Sun',
        });

        expect(updated.motto).toBe('Sun');
        expect(calls[0]?.init?.method).toBe('PUT');
        expect(calls[0]?.init?.body).toBe(
            JSON.stringify({
                name: 'Winnica Nowa',
                city: 'Sandomierz',
                motto: 'Sun',
            }),
        );
    });

    it('deletes an organisation with the current password', async () => {
        capture(new Response('', { status: 204 }));

        await deleteOrganisation('Superextrasecurepassword1!');

        expect(calls[0]?.init?.method).toBe('DELETE');
        expect(calls[0]?.init?.body).toBe(JSON.stringify({ password: 'Superextrasecurepassword1!' }));
    });

    it('reports that leaving a vineyard is not available yet', async () => {
        globalThis.fetch = (async () => {
            calls.push({ url: 'should-not-run' });
            return new Response('', { status: 204 });
        }) as typeof fetch;

        const error = await leaveOrganisation().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Leaving a vineyard is not available yet.');
        expect(calls).toEqual([]);
    });

    it('reads members and drops records that have no id or email', async () => {
        capture(
            json([
                {
                    id: 'member-1',
                    email: 'jane@example.com',
                    firstname: 'Jane',
                    roles: ['WORKER', 4],
                    phoneNumber: null,
                    membershipStatus: 'MEMBER',
                },
                { email: 'missing-id@example.com' },
            ]),
        );

        expect(await getOrganisationMembers()).toEqual([
            {
                id: 'member-1',
                firstname: 'Jane',
                lastname: '',
                email: 'jane@example.com',
                phoneNumber: null,
                membershipStatus: 'MEMBER',
                roles: ['WORKER'],
            },
        ]);
        expect(calls[0]?.url).toBe('/api/organisations/members');
    });

    it('returns no members when the payload is not a list', async () => {
        capture(json({ id: 'member-1' }));

        expect(await getOrganisationMembers()).toEqual([]);
    });

    it('reads pending invitations', async () => {
        capture(json([{ userId: 'user-1', email: 'pending@example.com', firstname: 'Adam' }]));

        expect(await getPendingInvitations()).toEqual([
            {
                userId: 'user-1',
                email: 'pending@example.com',
                firstname: 'Adam',
                lastname: '',
            },
        ]);
        expect(calls[0]?.url).toBe('/api/organisations/invitations');
    });

    it('invites an existing account by email', async () => {
        capture(new Response('', { status: 204 }));

        await inviteEmployee('new.worker@example.com');

        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[0]?.init?.body).toBe(JSON.stringify({ email: 'new.worker@example.com' }));
    });

    it('cancels a pending invitation', async () => {
        capture(new Response('', { status: 204 }));

        await cancelInvitation('user-1');

        expect(calls[0]?.url).toBe('/api/organisations/invitations/user-1');
        expect(calls[0]?.init?.method).toBe('DELETE');
    });

    it('adds and removes a vineyard role', async () => {
        capture(new Response('', { status: 204 }));

        await addOrganisationRole('user-1', 'OENOLOGIST');
        await removeOrganisationRole('user-1', 'WORKER');

        expect(calls[0]?.url).toBe('/api/organisations/users/user-1/roles?role=OENOLOGIST');
        expect(calls[0]?.init?.method).toBe('POST');
        expect(calls[1]?.url).toBe('/api/organisations/users/user-1/roles?role=WORKER');
        expect(calls[1]?.init?.method).toBe('DELETE');
    });

    it('surfaces a rejected organisation request', async () => {
        capture(json({ error: 'Access denied' }, 403));

        const error = await getOrganisation().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(403);
        expect((error as ApiError).message).toBe('Access denied');
    });
});

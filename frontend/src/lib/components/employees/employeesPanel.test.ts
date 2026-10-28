import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import EmployeesPanel from './employeesPanel.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: ['OWNER'],
};

const members = [
    {
        id: 'member-1',
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'jane.doe@gmail.com',
        phoneNumber: null,
        membershipStatus: 'MEMBER',
        roles: ['WORKER', 'OENOLOGIST'],
    },
];

const invitations = [
    {
        userId: 'invite-1',
        email: 'pending@gmail.com',
        firstname: 'Adam',
        lastname: 'Nowak',
    },
];

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('Employees panel', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; init?: RequestInit }[];

    beforeEach(() => {
        setUser(owner);
        calls = [];
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/organisations/members') {
                return json(members);
            }
            if (url === '/api/organisations/invitations' && (!init?.method || init.method === 'GET')) {
                return json(invitations);
            }
            if (url === '/api/organisations/invitations' && init?.method === 'POST') {
                return new Response('', { status: 204 });
            }
            if (url === '/api/organisations/invitations/invite-1' && init?.method === 'DELETE') {
                return new Response('', { status: 204 });
            }
            if (url.startsWith('/api/organisations/users/member-1/roles')) {
                return new Response('', { status: 204 });
            }
            return new Response(JSON.stringify({ error: 'missing' }), { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        setUser(null);
    });

    const shown = async () => {
        render(EmployeesPanel);
        await waitFor(() => {
            expect(screen.getByText('jane.doe@gmail.com')).toBeInTheDocument();
        });
    };

    it('lists members and pending invitations as separate row actions', async () => {
        await shown();

        expect(screen.getByText('Vineyard Worker')).toBeInTheDocument();
        expect(screen.getByText('Oenologist')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change roles' })).toBeInTheDocument();
        expect(screen.getByText('pending@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
        expect(screen.getByLabelText('Results toolbar')).toBeInTheDocument();
    });

    it('invites an existing account from a popup', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'New employee' }));

        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.glass')).toBeInTheDocument();
        await fireEvent.input(within(dialog).getByRole('textbox', { name: 'E-mail' }), {
            target: { value: 'new.worker@gmail.com' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Invite' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        const invite = calls.find((call) => call.url === '/api/organisations/invitations' && call.init?.method === 'POST');
        expect(invite?.init?.body).toBe(JSON.stringify({ email: 'new.worker@gmail.com' }));
    });

    it('marks an invalid invitation email before calling the server', async () => {
        const alerts: string[] = [];
        const originalAlert = globalThis.alert;
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;

        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'New employee' }));
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Invite' }));

        expect(alerts).toEqual([
            'Enter a valid email. The person needs an account before they can be invited.',
        ]);
        expect(within(dialog).getByLabelText('E-mail').parentElement).toHaveClass('border-red-500');
        expect(
            calls.some((call) => call.url === '/api/organisations/invitations' && call.init?.method === 'POST'),
        ).toBe(false);
        globalThis.alert = originalAlert;
    });

    it('removes a role from the change-roles popup', async () => {
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: 'Change roles' }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/Roles for/)).toHaveClass('text-lg');
        expect(dialog.querySelectorAll('.role-icon svg')).toHaveLength(2);
        expect(within(dialog).getByLabelText('Vineyard worker')).toBeChecked();
        await fireEvent.click(within(dialog).getByLabelText('Vineyard worker'));
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(
                calls.some(
                    (call) =>
                        call.url === '/api/organisations/users/member-1/roles?role=WORKER' &&
                        call.init?.method === 'DELETE',
                ),
            ).toBe(true);
        });
    });

    it('hides employee management from anyone who is not the owner', async () => {
        setUser({ ...owner, roles: ['WORKER'] });

        render(EmployeesPanel);

        expect(screen.getByText('Only the vineyard owner can manage employees.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'New employee' })).not.toBeInTheDocument();
        expect(calls.some((call) => call.url === '/api/organisations/members')).toBe(false);
    });

    it('explains that only the owner can open the employee list', async () => {
        globalThis.fetch = (async () =>
            json({ error: 'Access denied' }, 403)) as typeof fetch;

        render(EmployeesPanel);

        await waitFor(() => {
            expect(screen.getByText('Only the vineyard owner can manage employees.')).toBeInTheDocument();
        });
    });

    it('cancels a pending invitation after confirmation', async () => {
        await shown();
        const pendingRow = screen.getByText('pending@gmail.com').closest('tr');
        expect(pendingRow).toBeTruthy();
        await fireEvent.click(within(pendingRow as HTMLElement).getByRole('button', { name: 'Remove' }));
        await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

        await waitFor(() => {
            expect(
                calls.some(
                    (call) =>
                        call.url === '/api/organisations/invitations/invite-1' && call.init?.method === 'DELETE',
                ),
            ).toBe(true);
        });
    });
});

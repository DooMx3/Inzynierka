import { render, screen, waitFor, fireEvent, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { tick } from 'svelte';
import { gooeyToast } from 'goey-toast-svelte';
import UserHome from './userHome.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

const user = { id: '1', firstname: 'Anna', lastname: 'Nowak', email: 'anna@example.com' };

const userInfo = {
    membershipStatus: 'NONE',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: [] as string[],
};

const organisation = {
    id: 'org-1',
    name: 'Winnica Anna',
    city: 'Sandomierz',
    street: 'Winna 1',
    postalCode: '27-600',
    taxId: '123',
    motto: 'Sun in every glass.',
    logoPath: '/api/organisations/org-1/logo',
};

const invitation = { organisationId: 'org-1', organisationName: 'North vineyard' };
const invitedOrganisation = {
    id: 'org-1',
    name: 'North vineyard',
    city: 'Sandomierz',
    street: 'Winna 12',
    postalCode: '27-600',
    taxId: '456',
    motto: 'Rows worth joining.',
    logoPath: '/api/organisations/org-1/logo',
};

describe('User home', () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];
    let invitationPayload: unknown = invitation;
    let membershipStatus = 'NONE';
    let roles: string[] = [];
    let infoOrganisation: unknown = null;
    let warningSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'warning'>>;
    let errorSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'error'>>;
    let successSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'success'>>;
    let infoSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'info'>>;
    let promiseSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'promise'>>;

    beforeEach(() => {
        calls = [];
        invitationPayload = invitation;
        membershipStatus = 'NONE';
        roles = [];
        infoOrganisation = null;
        setUser(null);
        warningSpy = spyOn(gooeyToast, 'warning');
        errorSpy = spyOn(gooeyToast, 'error');
        successSpy = spyOn(gooeyToast, 'success');
        infoSpy = spyOn(gooeyToast, 'info');
        promiseSpy = spyOn(gooeyToast, 'promise').mockImplementation(() => 'toast-id');
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/info') {
                return new Response(
                    JSON.stringify({
                        ...userInfo,
                        membershipStatus,
                        roles,
                        organisation: infoOrganisation,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
            if (url === '/api/organisations' && (!init?.method || init.method === 'GET')) {
                return new Response(JSON.stringify(organisation), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations' && init?.method === 'PUT') {
                return new Response(JSON.stringify({ ...organisation, ...JSON.parse(String(init.body)) }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations' && init?.method === 'DELETE') {
                membershipStatus = 'NONE';
                roles = [];
                return new Response('', { status: 204 });
            }
            if (url === '/api/user/invitations') {
                return new Response(JSON.stringify(invitationPayload), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations' && init?.method === 'POST') {
                membershipStatus = 'MEMBER';
                roles = ['OWNER'];
                return new Response(JSON.stringify({ id: 'org-1', name: 'North vineyard' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/user/invitations/accept' && init?.method === 'POST') {
                return new Response('', { status: 204 });
            }
            if (url === '/api/organisations/leave' && init?.method === 'DELETE') {
                membershipStatus = 'NONE';
                roles = [];
                return new Response('', { status: 204 });
            }
            return new Response('missing', { status: 500 });
        }) as typeof fetch;
    });

    afterEach(() => {
        setUser(null);
        globalThis.fetch = originalFetch;
        warningSpy.mockRestore();
        errorSpy.mockRestore();
        successSpy.mockRestore();
        infoSpy.mockRestore();
        promiseSpy.mockRestore();
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    const shown = async () => {
        render(UserHome);
        await waitFor(() => {
            expect(calls.some((call) => call.url === '/api/user/invitations')).toBe(true);
        });
        await tick();
    };

    it('hides the user menu when nobody is signed in', async () => {
        render(UserHome);
        await tick();

        expect(screen.queryByRole('region', { name: 'User menu' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /vineyard/i })).not.toBeInTheDocument();
        expect(screen.getByText('Sign in to see your menu.')).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it('enables joining only when an invitation is waiting', async () => {
        setUser(user);
        await shown();

        expect(screen.getByRole('region', { name: 'User menu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create new vineyard/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /invited/i })).toBeEnabled();
    });

    it('keeps the join button disabled when there is no invitation', async () => {
        invitationPayload = null;
        setUser(user);
        await shown();

        expect(screen.getByRole('button', { name: /Create new vineyard/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /invited/i })).toBeDisabled();
    });

    it('keeps the menu when the invitation request fails', async () => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(input), init });
            return new Response('missing', { status: 500 });
        }) as typeof fetch;
        setUser(user);

        await shown();

        expect(screen.getByRole('region', { name: 'User menu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invited/i })).toBeDisabled();
    });

    it('opens the organisation form over a blurred page', async () => {
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));

        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.glass')).toBeInTheDocument();
        await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'North vineyard' } });
        await fireEvent.input(screen.getByLabelText('City'), { target: { value: 'Sandomierz' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(calls.filter((call) => call.url === '/api/user/info').length).toBeGreaterThanOrEqual(2);
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(promiseSpy).toHaveBeenCalledTimes(1);
        expect(promiseSpy.mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                success: 'Organisation created',
                description: {
                    success: 'The organisation is ready. You are its owner.',
                },
            }),
        );
        expect(session.user?.roles).toContain('OWNER');
        const create = calls.find((call) => call.url === '/api/organisations' && call.init?.method === 'POST');
        expect(create?.init?.body).toBe(
            JSON.stringify({
                name: 'North vineyard',
                city: 'Sandomierz',
            }),
        );
    });

    it('shows the inviting organisation details in the popup', async () => {
        membershipStatus = 'PENDING';
        infoOrganisation = invitedOrganisation;
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /invited/i }));

        const preview = screen.getByLabelText('Inviting organisation');
        expect(within(preview).getByRole('heading', { name: 'North vineyard' })).toBeInTheDocument();
        expect(within(preview).getByText('Rows worth joining.')).toBeInTheDocument();
        expect(within(preview).getByText('Winna 12')).toBeInTheDocument();
        expect(within(preview).getByText('27-600 Sandomierz')).toBeInTheDocument();
        expect(within(preview).getByAltText('Organisation logo')).toHaveAttribute(
            'src',
            expect.stringContaining('/api/organisations/org-1/logo'),
        );
    });

    it('accepts an invitation from the popup', async () => {
        membershipStatus = 'PENDING';
        infoOrganisation = invitedOrganisation;
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /invited/i }));

        expect(screen.getByRole('heading', { name: 'North vineyard' })).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Join' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/workers');
        });
        expect(calls.some((call) => call.url === '/api/user/invitations/accept')).toBe(true);
    });

    it('puts the vineyard fields in two columns on a medium screen', async () => {
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = ((query: string) => ({
            matches: query === '(min-width: 840px) and (max-width: 1499px)',
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as typeof window.matchMedia;
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));

        expect(document.querySelector('.org-fields')).toHaveClass('is-side');
        window.matchMedia = originalMatchMedia;
    });

    it('keeps the vineyard fields in one column on a phone', async () => {
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as typeof window.matchMedia;
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));

        expect(document.querySelector('.org-fields')).not.toHaveClass('is-side');
        window.matchMedia = originalMatchMedia;
    });

    it('marks an empty organisation name and city before calling the server', async () => {
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        expect(warningSpy).toHaveBeenCalledWith('Check vineyard details', {
            description: 'Enter the organisation name. Enter the city.',
        });
        expect(screen.getByLabelText('Name').parentElement).toHaveClass('border-red-500');
        expect(screen.getByLabelText('City').parentElement).toHaveClass('border-red-500');
        expect(screen.getByLabelText('Street').parentElement).not.toHaveClass('border-red-500');
        expect(calls.some((call) => call.url === '/api/organisations' && call.init?.method === 'POST')).toBe(false);
    });

    it('shows employee workspace without Leave vineyard button on home (relocated to Profile)', async () => {
        membershipStatus = 'MEMBER';
        invitationPayload = null;
        infoOrganisation = organisation;
        setUser(user);
        await shown();

        expect(screen.getByRole('heading', { name: 'Winnica Anna' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Create new vineyard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Leave vineyard' })).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Membership settings in Profile/i }),
        ).toHaveAttribute('href', '/profile');
    });

    it('shows owner executive dashboard without Edit/Delete vineyard buttons on home (relocated to Management)', async () => {
        membershipStatus = 'MEMBER';
        roles = ['OWNER'];
        invitationPayload = null;
        infoOrganisation = organisation;
        setUser(user);
        await shown();

        expect(await screen.findByText('Sun in every glass.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit vineyard' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete vineyard' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Vineyard' })).toHaveAttribute(
            'href',
            '/management/vineyard',
        );
    });
});

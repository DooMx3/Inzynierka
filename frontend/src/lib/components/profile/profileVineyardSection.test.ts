import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { gooeyToast } from 'goey-toast-svelte';
import ProfileVineyardSection from './profileVineyardSection.svelte';
import { setUser } from '$lib/stores/session.svelte';

const sampleOrganisation = {
    id: 'org-1',
    name: 'Winnica Sandomierska',
    city: 'Sandomierz',
    street: 'Winna 7',
    postalCode: '27-600',
    taxId: '9876543210',
    motto: 'Sun in every glass.',
    logoPath: '/api/organisations/org-1/logo',
};

describe('ProfileVineyardSection (/profile)', () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];
    let membershipStatus = 'MEMBER';
    let roles: string[] = ['WORKER'];
    let infoOrganisation: unknown = sampleOrganisation;
    let invitationPayload: unknown = null;
    let infoSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'info'>>;

    beforeEach(() => {
        calls = [];
        membershipStatus = 'MEMBER';
        roles = ['WORKER'];
        infoOrganisation = sampleOrganisation;
        invitationPayload = null;
        infoSpy = spyOn(gooeyToast, 'info');
        setUser({
            id: 'user-1',
            firstname: 'Piotr',
            lastname: 'Kowalski',
            email: 'piotr@winnica.pl',
            roles: ['WORKER'],
        });
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/profile' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/info') {
                return new Response(
                    JSON.stringify({
                        id: 'user-1',
                        firstname: 'Piotr',
                        lastname: 'Kowalski',
                        email: 'piotr@winnica.pl',
                        membershipStatus,
                        roles,
                        organisation: infoOrganisation,
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }
            if (url === '/api/organisations' && (!init?.method || init.method === 'GET')) {
                return new Response(JSON.stringify(sampleOrganisation), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/user/invitations') {
                if (!invitationPayload) {
                    return new Response('', { status: 204 });
                }
                return new Response(JSON.stringify(invitationPayload), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations/leave' && init?.method === 'DELETE') {
                membershipStatus = 'NONE';
                roles = [];
                infoOrganisation = null;
                return new Response('', { status: 204 });
            }
            if (url === '/api/user/invitations/accept' && init?.method === 'POST') {
                return new Response('', { status: 204 });
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        setUser(null);
        globalThis.fetch = originalFetch;
        infoSpy.mockRestore();
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    it('lets a non-owner member inspect their vineyard and leave it from Profile', async () => {
        render(ProfileVineyardSection);

        expect(
            await screen.findByRole('heading', { name: 'Winnica Sandomierska' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Vineyard Worker')).toBeInTheDocument();
        expect(screen.getByText('Sun in every glass.')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Leave vineyard' }));
        expect(screen.getByText(/Leave the vineyard/)).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Create new vineyard/i }),
            ).toBeEnabled();
            expect(infoSpy).toHaveBeenCalledWith('Left vineyard', {
                description: 'You are no longer a member of this organisation.',
            });
        });
        expect(
            calls.some(
                (call) =>
                    call.url === '/api/organisations/leave' && call.init?.method === 'DELETE',
            ),
        ).toBe(true);
    });

    it('lets an unassigned user accept a vineyard invitation directly from Profile', async () => {
        membershipStatus = 'PENDING';
        roles = [];
        invitationPayload = {
            organisationId: 'org-1',
            organisationName: 'Winnica Sandomierska',
        };

        render(ProfileVineyardSection);

        const inviteBtn = await screen.findByRole('button', { name: /invited/i });
        expect(inviteBtn).toBeEnabled();
        await fireEvent.click(inviteBtn);

        expect(
            screen.getByRole('heading', { name: 'Winnica Sandomierska' }),
        ).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Join' }));

        await waitFor(() => {
            expect(window.location.href).toBe('/');
        });
        expect(
            calls.some(
                (call) =>
                    call.url === '/api/user/invitations/accept' && call.init?.method === 'POST',
            ),
        ).toBe(true);
    });

    it('points the owner to /management/vineyard instead of showing Leave or Edit buttons in Profile', async () => {
        membershipStatus = 'MEMBER';
        roles = ['OWNER'];

        render(ProfileVineyardSection);

        const manageLink = await screen.findByRole('link', {
            name: 'Open Vineyard Management →',
        });
        expect(manageLink).toHaveAttribute('href', '/management/vineyard');
        expect(
            screen.queryByRole('button', { name: 'Leave vineyard' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Edit vineyard' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Delete vineyard' }),
        ).not.toBeInTheDocument();
    });
});

import { render, screen, waitFor, fireEvent, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tick } from 'svelte';
import UserHome from './userHome.svelte';
import { setUser } from '$lib/stores/session.svelte';

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
};

const invitation = [{ organisationId: 'org-1', organisationName: 'North vineyard' }];

describe('User home', () => {
    const originalFetch = globalThis.fetch;
    const originalAlert = globalThis.alert;
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];
    let invitations: unknown = invitation;
    let membershipStatus = 'NONE';
    let roles: string[] = [];

    beforeEach(() => {
        calls = [];
        invitations = invitation;
        membershipStatus = 'NONE';
        roles = [];
        setUser(null);
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/user/info') {
                return new Response(JSON.stringify({ ...userInfo, membershipStatus, roles }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
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
                return new Response('', { status: 204 });
            }
            if (url === '/api/user/invitations') {
                return new Response(JSON.stringify(invitations), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations' && init?.method === 'POST') {
                return new Response(JSON.stringify({ id: 'org-1', name: 'North vineyard' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/user/invitations/accept' && init?.method === 'POST') {
                return new Response('', { status: 204 });
            }
            return new Response('missing', { status: 500 });
        }) as typeof fetch;
    });

    afterEach(() => {
        setUser(null);
        globalThis.fetch = originalFetch;
        globalThis.alert = originalAlert;
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
        invitations = [];
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
        const alerts: string[] = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;

        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));

        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.glass')).toBeInTheDocument();
        await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'North vineyard' } });
        await fireEvent.input(screen.getByLabelText('City'), { target: { value: 'Sandomierz' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(alerts[0]).toBe('The organisation is ready. You are its owner.');
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const create = calls.find((call) => call.url === '/api/organisations' && call.init?.method === 'POST');
        expect(create?.init?.body).toBe(
            JSON.stringify({
                name: 'North vineyard',
                city: 'Sandomierz',
            }),
        );
    });

    it('accepts an invitation from the popup', async () => {
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /invited/i }));

        expect(screen.getByText('North vineyard')).toBeInTheDocument();
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
        const alerts: string[] = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        setUser(user);
        await shown();
        await fireEvent.click(screen.getByRole('button', { name: /Create new vineyard/i }));
        await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        expect(alerts).toEqual(['Enter the organisation name.\nEnter the city.']);
        expect(screen.getByLabelText('Name').parentElement).toHaveClass('border-red-500');
        expect(screen.getByLabelText('City').parentElement).toHaveClass('border-red-500');
        expect(screen.getByLabelText('Street').parentElement).not.toHaveClass('border-red-500');
        expect(calls.some((call) => call.url === '/api/organisations' && call.init?.method === 'POST')).toBe(false);
    });

    it('offers a member a way to leave the vineyard', async () => {
        const alerts: string[] = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        membershipStatus = 'MEMBER';
        invitations = [];
        setUser(user);
        await shown();

        expect(screen.getByText('You are part of the vineyard.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Create new vineyard/i })).not.toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Leave vineyard' }));
        expect(screen.getByText(/Leave the vineyard/)).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

        expect(alerts).toEqual(['Leaving a vineyard is not available yet.']);
        expect(calls.some((call) => call.url === '/api/organisations' && call.init?.method === 'DELETE')).toBe(false);
    });

    it('lets the owner edit and delete the vineyard', async () => {
        const alerts: string[] = [];
        globalThis.alert = ((message?: string) => {
            alerts.push(String(message ?? ''));
        }) as typeof alert;
        membershipStatus = 'MEMBER';
        roles = ['OWNER'];
        invitations = [];
        setUser(user);
        await shown();

        expect(await screen.findByText('Sun in every glass.')).toBeInTheDocument();
        await fireEvent.click(screen.getByRole('button', { name: 'Edit vineyard' }));
        const name = screen.getByLabelText('Name') as HTMLInputElement;
        expect(name.value).toBe('Winnica Anna');
        await fireEvent.input(name, { target: { value: 'Winnica Nowa' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Winnica Nowa' })).toBeInTheDocument();
        });
        const update = calls.find((call) => call.url === '/api/organisations' && call.init?.method === 'PUT');
        expect(update?.init?.body).toContain('"name":"Winnica Nowa"');

        await fireEvent.click(screen.getByRole('button', { name: 'Delete vineyard' }));
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete vineyard' }));
        expect(alerts).toEqual(['Enter your password.']);
        expect(within(dialog).getByLabelText('Password').parentElement).toHaveClass('border-red-500');
        expect(calls.some((call) => call.url === '/api/organisations' && call.init?.method === 'DELETE')).toBe(false);

        await fireEvent.input(within(dialog).getByLabelText('Password'), {
            target: { value: 'Superextrasecurepassword1!' },
        });
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete vineyard' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Create new vineyard/i })).toBeEnabled();
        });
        const removal = calls.find((call) => call.url === '/api/organisations' && call.init?.method === 'DELETE');
        expect(removal?.init?.body).toBe(JSON.stringify({ password: 'Superextrasecurepassword1!' }));
    });
});

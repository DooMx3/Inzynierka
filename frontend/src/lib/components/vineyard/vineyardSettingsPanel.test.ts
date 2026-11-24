import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { gooeyToast } from 'goey-toast-svelte';
import VineyardSettingsPanel from './vineyardSettingsPanel.svelte';
import { session, setUser } from '$lib/stores/session.svelte';

const ownerUser = {
    id: 'owner-1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@winnica.pl',
    roles: ['OWNER'],
};

const workerUser = {
    id: 'worker-1',
    firstname: 'Piotr',
    lastname: 'Zieliński',
    email: 'piotr@winnica.pl',
    roles: ['WORKER'],
};

const sampleOrganisation = {
    id: 'org-1',
    name: 'Winnica Anna',
    city: 'Sandomierz',
    street: 'Winna 1',
    postalCode: '27-600',
    taxId: '1234567890',
    motto: 'Sun in every glass.',
    logoPath: '/api/organisations/org-1/logo',
};

describe('VineyardSettingsPanel (/management/vineyard)', () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;
    let calls: { url: string; init?: RequestInit }[];
    let warningSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'warning'>>;
    let successSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'success'>>;
    let infoSpy: ReturnType<typeof spyOn<typeof gooeyToast, 'info'>>;

    beforeEach(() => {
        calls = [];
        setUser(ownerUser);
        warningSpy = spyOn(gooeyToast, 'warning');
        successSpy = spyOn(gooeyToast, 'success');
        infoSpy = spyOn(gooeyToast, 'info');
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/management/vineyard' },
        });
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url === '/api/organisations' && (!init?.method || init.method === 'GET')) {
                return new Response(JSON.stringify(sampleOrganisation), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations' && init?.method === 'PUT') {
                const updated = {
                    ...sampleOrganisation,
                    ...JSON.parse(String(init.body)),
                };
                return new Response(JSON.stringify(updated), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/organisations/logo' && init?.method === 'DELETE') {
                return new Response('', { status: 204 });
            }
            if (url === '/api/organisations' && init?.method === 'DELETE') {
                return new Response('', { status: 204 });
            }
            if (url === '/api/user/info') {
                return new Response(
                    JSON.stringify({
                        id: 'owner-1',
                        firstname: 'Anna',
                        lastname: 'Nowak',
                        email: 'anna@winnica.pl',
                        roles: [],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }
            return new Response('missing', { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        setUser(null);
        globalThis.fetch = originalFetch;
        warningSpy.mockRestore();
        successSpy.mockRestore();
        infoSpy.mockRestore();
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
    });

    it('restricts access to organisation owners', () => {
        setUser(workerUser);
        render(VineyardSettingsPanel);

        expect(
            screen.getByText('Only the organisation owner can edit or delete vineyard settings.'),
        ).toBeInTheDocument();
    });

    it('lets the owner edit vineyard details, remove logo, and delete the vineyard with password confirmation', async () => {
        render(VineyardSettingsPanel);

        expect(await screen.findByText('Sun in every glass.')).toBeInTheDocument();
        expect(screen.getByText('Sandomierz')).toBeInTheDocument();
        expect(screen.getByText('Winna 1')).toBeInTheDocument();

        // Remove logo
        await fireEvent.click(screen.getByRole('button', { name: 'Remove current logo' }));
        await waitFor(() => {
            expect(
                calls.some(
                    (c) => c.url === '/api/organisations/logo' && c.init?.method === 'DELETE',
                ),
            ).toBe(true);
        });

        // Edit vineyard
        await fireEvent.click(screen.getByRole('button', { name: 'Edit vineyard' }));
        const editDialog = screen.getByRole('dialog');
        const nameInput = within(editDialog).getByLabelText('Name') as HTMLInputElement;
        expect(nameInput.value).toBe('Winnica Anna');
        await fireEvent.input(nameInput, { target: { value: 'Winnica Królewska' } });
        await fireEvent.click(within(editDialog).getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Winnica Królewska' }),
            ).toBeInTheDocument();
        });
        expect(successSpy).toHaveBeenCalledWith('Vineyard updated', {
            description: 'Organisation details have been saved.',
        });

        // Delete vineyard requires password
        await fireEvent.click(screen.getByRole('button', { name: 'Delete vineyard' }));
        const deleteDialog = screen.getByRole('dialog');
        await fireEvent.click(
            within(deleteDialog).getByRole('button', { name: 'Delete vineyard' }),
        );
        expect(warningSpy).toHaveBeenCalledWith('Password required', {
            description: 'Enter your password.',
        });

        await fireEvent.input(within(deleteDialog).getByLabelText('Password'), {
            target: { value: 'SuperSecret123!' },
        });
        await fireEvent.click(
            within(deleteDialog).getByRole('button', { name: 'Delete vineyard' }),
        );

        await waitFor(() => {
            expect(window.location.href).toBe('/');
        });
        expect(infoSpy).toHaveBeenCalledWith('Vineyard deleted', {
            description: 'The organisation has been permanently removed.',
        });
        expect(session.user?.roles).not.toContain('OWNER');
        const removal = calls.find(
            (call) => call.url === '/api/organisations' && call.init?.method === 'DELETE',
        );
        expect(removal?.init?.body).toBe(JSON.stringify({ password: 'SuperSecret123!' }));
    });
});

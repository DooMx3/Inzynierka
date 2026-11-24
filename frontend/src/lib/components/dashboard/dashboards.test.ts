import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import OwnerDashboard from './ownerDashboard.svelte';
import EmployeeDashboard from './employeeDashboard.svelte';
import { setUser } from '$lib/stores/session.svelte';
import type { Organisation } from '$lib/api/organisation';
import type { ProductionBatch } from '$lib/api/batches';

const sampleOrganisation: Organisation = {
    id: 'org-1',
    name: 'Winnica Sandomierska',
    city: 'Sandomierz',
    street: 'Winna 7',
    postalCode: '27-600',
    taxId: '9876543210',
    motto: 'Crafted on sunny loess slopes.',
    logoPath: '/api/organisations/org-1/logo',
};

const sampleBatches: ProductionBatch[] = [
    {
        id: 'batch-1',
        batchNumber: 'BATCH-1001',
        name: 'Solaris Reserve Must',
        stage: 'MUST',
        quantity: 420,
        equipmentId: 'eq-tank-1',
        equipmentLabel: 'Tank #1',
        createdAt: '2026-09-20T10:00:00.000Z',
        isSpoiled: false,
        yeastId: 'EC1118',
        description: 'First press must',
        sources: [],
        ingredients: [],
        nutrientsOverride: null,
    },
    {
        id: 'batch-2',
        batchNumber: 'BATCH-1002',
        name: 'Regent Barrel Lot',
        stage: 'AGED',
        quantity: 225,
        equipmentId: 'eq-barrel-1',
        equipmentLabel: 'French Oak #1',
        createdAt: '2026-10-05T12:00:00.000Z',
        isSpoiled: true,
        yeastId: 'RC212',
        description: 'Volatile acidity detected',
        sources: [],
        ingredients: [],
        nutrientsOverride: null,
    },
    {
        id: 'batch-3',
        batchNumber: 'BATCH-1003',
        name: 'Johanniter Cuvée',
        stage: 'BOTTLED',
        quantity: 300,
        equipmentId: 'eq-line-1',
        equipmentLabel: 'Bottling Line',
        createdAt: '2026-11-01T09:00:00.000Z',
        isSpoiled: false,
        yeastId: 'EC1118',
        description: 'Estate bottled white',
        sources: [],
        ingredients: [],
        nutrientsOverride: null,
    },
];

const sampleFields = [
    {
        id: 'field-1',
        areaAre: 45,
        grapeVariety: 'SOLARIS',
        grapeVarietyName: 'Solaris',
        grapeColor: 'WHITE',
        active: true,
    },
    {
        id: 'field-2',
        areaAre: 30,
        grapeVariety: 'REGENT',
        grapeVarietyName: 'Regent',
        grapeColor: 'RED',
        active: true,
    },
];

const sampleHarvests = [
    {
        id: 'harvest-1',
        fields: [sampleFields[0]],
        amountKg: 1450,
        harvestDate: '2026-09-18T08:00:00.000Z',
        active: true,
    },
];

const sampleOfferings = [
    {
        id: 'off-1',
        organisationId: 'org-1',
        wineId: 'batch-3',
        wineName: 'Johanniter Estate 2026',
        wineDescription: 'Crisp mineral white wine',
        price: 68,
    },
    {
        id: 'off-other',
        organisationId: 'org-2',
        wineId: 'wine-other',
        wineName: 'Foreign Vineyard Wine',
        wineDescription: 'Should not appear on org-1 dashboard',
        price: 99,
    },
];

const sampleSprayings = [
    {
        id: 'spray-1',
        fieldId: 'field-1',
        equipmentId: 'eq-1',
        substanceId: 'sub-1',
        sprayingDate: '2027-05-15T10:00:00.000Z',
        quantity: 120,
        due: '2027-05-20T10:00:00.000Z',
    },
];

const samplePests = [
    {
        id: 'pest-1',
        fieldId: 'field-1',
        type: 'DISEASE',
        name: 'Powdery mildew',
        observedAt: '2026-07-12T09:00:00.000Z',
        description: 'Spotted on lower canopy leaves',
        active: true,
    },
];

const sampleTasks = [
    {
        id: 'task-1',
        type: 'SPRAYING',
        name: 'Sulfur canopy protection',
        description: 'Spray Solaris parcel before noon.',
        createdById: 'owner-1',
        creatorRoleAtCreation: 'OWNER',
        assignedUserId: 'worker-1',
        fieldId: 'field-1',
        equipmentId: null,
        substanceId: null,
        batchId: null,
        bottlingId: null,
        recordId: null,
        startedAt: '2026-11-20',
        completedAt: null,
        dueDate: '2026-11-10',
        completed: false,
    },
];

describe('Differentiated Vineyard Dashboards', () => {
    const originalFetch = globalThis.fetch;
    let calls: { url: string; method: string }[];

    beforeEach(() => {
        calls = [];
        localStorage.clear();
        localStorage.setItem('wms_production_batches_v1', JSON.stringify(sampleBatches));
        setUser(null);

        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';
            calls.push({ url, method });

            if (url === '/api/fields' && method === 'GET') {
                return new Response(JSON.stringify(sampleFields), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/harvests' && method === 'GET') {
                return new Response(JSON.stringify(sampleHarvests), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/offerings' && method === 'GET') {
                return new Response(JSON.stringify(sampleOfferings), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/spraying' && method === 'GET') {
                return new Response(JSON.stringify(sampleSprayings), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/pest-observations' && method === 'GET') {
                return new Response(JSON.stringify(samplePests), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/tasks' && method === 'GET') {
                return new Response(JSON.stringify(sampleTasks), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url === '/api/tasks/task-1/complete' && method === 'PATCH') {
                return new Response(
                    JSON.stringify({
                        ...sampleTasks[0],
                        completed: true,
                        completedAt: '2026-11-23T14:00:00.000Z',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;
    });

    afterEach(() => {
        localStorage.clear();
        setUser(null);
        globalThis.fetch = originalFetch;
    });

    it('renders executive KPIs, 2x2 overview tables, and Management quick links without Edit/Delete vineyard buttons in OwnerDashboard', async () => {
        render(OwnerDashboard, {
            organisation: sampleOrganisation,
            logoTimestamp: 1700000000,
        });

        expect(
            screen.getByRole('heading', { name: 'Winnica Sandomierska' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Crafted on sunny loess slopes.')).toBeInTheDocument();
        expect(screen.getByText('Owner')).toBeInTheDocument();

        // Management quick pills including Vineyard settings
        expect(screen.getByRole('link', { name: 'Vineyard' })).toHaveAttribute(
            'href',
            '/management/vineyard',
        );
        expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
            'href',
            '/raports',
        );
        expect(screen.getByRole('link', { name: 'QR Codes' })).toHaveAttribute(
            'href',
            '/management/qr-codes',
        );
        expect(screen.getByRole('link', { name: 'Offerings' })).toHaveAttribute(
            'href',
            '/management/offerings',
        );
        expect(screen.getByRole('link', { name: 'Workers' })).toHaveAttribute(
            'href',
            '/workers',
        );

        // Edit & Delete vineyard buttons are NOT on the dashboard anymore
        expect(
            screen.queryByRole('button', { name: 'Edit vineyard' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Delete vineyard' }),
        ).not.toBeInTheDocument();

        // KPI strip
        const kpiRegion = screen.getByRole('region', { name: 'Vineyard KPI summary' });
        await waitFor(() => {
            expect(within(kpiRegion).getByText('75 ar')).toBeInTheDocument();
        });
        expect(within(kpiRegion).getByText('Vineyard Parcels')).toBeInTheDocument();
        expect(within(kpiRegion).getByText('Production Batches')).toBeInTheDocument();
        expect(within(kpiRegion).getByText('1 spoiled')).toBeInTheDocument();
        expect(within(kpiRegion).getByText('Team Tasks')).toBeInTheDocument();
        expect(within(kpiRegion).getByText('1 overdue')).toBeInTheDocument();
        expect(within(kpiRegion).getByText('Vineyard Offerings')).toBeInTheDocument();

        // 2x2 Overview Tables (scoped to org-1 offerings)
        expect(screen.getByRole('heading', { name: 'Recent Batches' })).toBeInTheDocument();
        expect(screen.getByText('BATCH-1002')).toBeInTheDocument();
        expect(screen.getByText('Regent Barrel Lot')).toBeInTheDocument();
        expect(screen.getByText('SPOILED')).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: 'Recent Harvests' })).toBeInTheDocument();
        expect(screen.getByText('1450 kg')).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: 'Current Offerings' })).toBeInTheDocument();
        expect(screen.getByText('Johanniter Estate 2026')).toBeInTheDocument();
        expect(screen.getByText('68 PLN')).toBeInTheDocument();
        expect(screen.queryByText('Foreign Vineyard Wine')).not.toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Recent & Planned Sprayings' }),
        ).toBeInTheDocument();
        expect(screen.getByText('120 L')).toBeInTheDocument();
    });

    it('renders WORKER operational workspace with Field Work Operations and Profile link instead of Leave button', async () => {
        setUser({
            id: 'worker-1',
            firstname: 'Piotr',
            lastname: 'Zieliński',
            email: 'piotr@vineyard.pl',
            roles: ['WORKER'],
        });

        render(EmployeeDashboard, {
            organisation: sampleOrganisation,
            roles: ['WORKER'],
            logoTimestamp: 1700000000,
        });

        expect(screen.getByText('Vineyard Worker')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Membership settings in Profile/i }),
        ).toHaveAttribute('href', '/profile');
        expect(
            screen.queryByRole('button', { name: 'Leave vineyard' }),
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole('heading', { name: 'Field Work Operations' }),
        ).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Sulfur canopy protection')).toBeInTheDocument();
        });

        // Complete task directly from dashboard
        const completeBtn = screen.getByRole('button', { name: 'Complete' });
        await fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(screen.getByText('Completed')).toBeInTheDocument();
        });
        expect(
            calls.some(
                (call) =>
                    call.url === '/api/tasks/task-1/complete' && call.method === 'PATCH',
            ),
        ).toBe(true);
    });

    it('renders OENOLOGIST cellar stage pipeline and spoiled batch alerts while hiding owner tools', async () => {
        setUser({
            id: 'oeno-1',
            firstname: 'Marek',
            lastname: 'Wiśniewski',
            email: 'marek@vineyard.pl',
            roles: ['OENOLOGIST'],
        });

        render(EmployeeDashboard, {
            organisation: sampleOrganisation,
            roles: ['OENOLOGIST'],
            logoTimestamp: 1700000000,
        });

        expect(screen.getByText('Oenologist')).toBeInTheDocument();
        const pipelineSection = screen.getByRole('region', {
            name: 'Cellar Stage Pipeline',
        });
        expect(pipelineSection).toBeInTheDocument();

        await waitFor(() => {
            expect(
                within(pipelineSection).getByText('Regent Barrel Lot'),
            ).toBeInTheDocument();
        });
        expect(within(pipelineSection).getByText('SPOILED')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Leave vineyard' }),
        ).not.toBeInTheDocument();
    });

    it('renders awaiting role assignment notice and links to Profile for unassigned members', () => {
        render(EmployeeDashboard, {
            organisation: sampleOrganisation,
            roles: [],
            logoTimestamp: 1700000000,
        });

        expect(screen.getByText('Awaiting role assignment')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Permissions not assigned yet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Membership settings in Profile/i }),
        ).toHaveAttribute('href', '/profile');
        expect(
            screen.queryByRole('button', { name: 'Leave vineyard' }),
        ).not.toBeInTheDocument();
    });
});

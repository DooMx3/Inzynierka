import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import CustomerBottleView from './customerBottleView.svelte';
import PublicOfferingsPage from '../../../routes/offerings/+page.svelte';
import BottleDetailsPage from '../../../routes/offerings/[id]/+page.svelte';
import { createBatch } from '$lib/api/batches';
import { createOffering } from '$lib/api/offerings';
import { createBatchParameter } from '$lib/api/parameters';
import { setUser } from '$lib/stores/session.svelte';

describe('Public Offerings Catalog & Customer Bottle View (unauthenticated guest)', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
        setUser(null);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        localStorage.clear();
        setUser(null);
    });

    const seedEstateBottleOffering = async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ message: 'Local bottle seed' }), {
                status: 404,
            })) as unknown as typeof fetch;

        const must = await createBatch({
            name: 'Regent Must 2026',
            stage: 'MUST',
            quantity: 260,
            equipmentId: 'eq-press-1',
            equipmentLabel: 'Pneumatic Press #1',
            sources: [
                {
                    sourceId: 'harvest-regent-1',
                    sourceType: 'HARVEST',
                    label: 'Harvest 2026-09-14 | Regent | 340 kg',
                    quantity: 340,
                },
            ],
        });

        const fermenting = await createBatch({
            name: 'Regent Fermentation #1',
            stage: 'FERMENTING',
            quantity: 230,
            equipmentId: 'eq-ferm-1',
            equipmentLabel: 'Stainless Fermentor #1',
            sources: [
                {
                    sourceId: must.id,
                    sourceType: 'BATCH',
                    label: `${must.batchNumber} | ${must.name}`,
                    quantity: 230,
                },
            ],
        });

        const aged = await createBatch({
            name: 'Regent Barrique Lot',
            stage: 'AGED',
            quantity: 200,
            equipmentId: 'eq-bar-1',
            equipmentLabel: 'Hungarian Oak Barrel #3 (Barrel)',
            sources: [
                {
                    sourceId: fermenting.id,
                    sourceType: 'BATCH',
                    label: `${fermenting.batchNumber} | ${fermenting.name}`,
                    quantity: 200,
                },
            ],
        });
        // Adjust aged batch createdAt in localStorage so barrel duration spans multiple months
        const rawBatches = JSON.parse(
            localStorage.getItem('wms_production_batches_v1') ?? '[]',
        ) as Array<Record<string, unknown>>;
        for (const item of rawBatches) {
            if (item.id === must.id) {
                item.createdAt = '2026-09-14T12:00:00.000Z';
            } else if (item.id === fermenting.id) {
                item.createdAt = '2026-09-16T09:00:00.000Z';
            } else if (item.id === aged.id) {
                item.createdAt = '2026-10-01T10:00:00.000Z';
            }
        }
        localStorage.setItem('wms_production_batches_v1', JSON.stringify(rawBatches));

        const bottled = await createBatch({
            name: 'Regent Grand Reserve',
            stage: 'BOTTLED',
            quantity: 185,
            equipmentId: 'eq-bot-1',
            equipmentLabel: 'Bottling Line #1',
            description: 'Blackberry, dark plum, and toasted oak spice.',
            sources: [
                {
                    sourceId: aged.id,
                    sourceType: 'BATCH',
                    label: `${aged.batchNumber} | ${aged.name}`,
                    quantity: 185,
                },
            ],
        });

        // Pin bottled batch date to 2026-11-20 for deterministic assertions
        const updatedBatches = JSON.parse(
            localStorage.getItem('wms_production_batches_v1') ?? '[]',
        ) as Array<Record<string, unknown>>;
        for (const item of updatedBatches) {
            if (item.id === bottled.id) {
                item.createdAt = '2026-11-20T14:00:00.000Z';
            }
        }
        localStorage.setItem('wms_production_batches_v1', JSON.stringify(updatedBatches));

        await createBatchParameter(bottled.id, {
            sugarLevel: 3.2,
            acidity: 5.8,
            pH: 3.54,
            alcoholContent: 13.6,
        });

        const offering = await createOffering({
            wineId: bottled.id,
            wineName: bottled.name,
            wineDescription: bottled.description,
            price: 85,
            organisationId: 'org-lublin-1',
            organisationName: 'Winnica Sandomierska',
        });

        return offering;
    };

    it('renders the public offerings catalog for an unauthenticated guest with specifications and provenance link', async () => {
        window.location.href = 'http://localhost/offerings';
        const offering = await seedEstateBottleOffering();

        globalThis.fetch = (async () =>
            new Response('[]', { status: 200 })) as unknown as typeof fetch;

        render(PublicOfferingsPage);

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Our Wine Offerings' }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('heading', { name: 'Regent Grand Reserve' }),
            ).toBeInTheDocument();
        });

        expect(screen.getByText('85 PLN')).toBeInTheDocument();
        expect(screen.getByText('Dry wine')).toBeInTheDocument();
        expect(screen.getByText('13.6%')).toBeInTheDocument();
        expect(screen.getByText('2026')).toBeInTheDocument();
        expect(screen.getByText('Hungarian Oak Barrel #3')).toBeInTheDocument();
        expect(screen.getByText('Regent')).toBeInTheDocument();

        const provenanceLink = screen.getByRole('link', {
            name: 'View bottle provenance →',
        });
        expect(provenanceLink).toHaveAttribute('href', `/offerings/${offering.id}`);

        // Search filter narrows results
        await fireEvent.input(screen.getByLabelText('Search wines'), {
            target: { value: 'Chardonnay' },
        });
        expect(
            screen.getByText('No wine offerings match your criteria.'),
        ).toBeInTheDocument();
    });

    it('renders Customer Bottle View (/offerings/[id]) for an unauthenticated guest with chemical parameters, production timeline, and table of nutrients', async () => {
        const offering = await seedEstateBottleOffering();
        window.location.href = `http://localhost/offerings/${offering.id}`;

        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ message: 'Not on remote' }), {
                status: 404,
            })) as unknown as typeof fetch;

        render(BottleDetailsPage);

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Regent Grand Reserve' }),
            ).toBeInTheDocument();
        });

        // Navigation & Hero section
        expect(
            screen.getByRole('link', { name: '← Back to offerings' }),
        ).toHaveAttribute('href', '/offerings');
        expect(screen.getByText('Winnica Sandomierska')).toBeInTheDocument();
        expect(screen.getByText('85 PLN')).toBeInTheDocument();
        expect(screen.getByText('Dry wine')).toBeInTheDocument();
        expect(screen.getByText('Vintage 2026')).toBeInTheDocument();
        expect(
            screen.getByText('Blackberry, dark plum, and toasted oak spice.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Wine bottle label for Regent Grand Reserve' }),
        ).toBeInTheDocument();

        // Final Wine Parameters Card (sugar, acidity, pH, alcohol)
        const paramsSection = screen.getByRole('region', {
            name: 'Final wine parameters',
        });
        expect(within(paramsSection).getByText('3.2 g/L')).toBeInTheDocument();
        expect(within(paramsSection).getByText('5.8 g/L')).toBeInTheDocument();
        expect(within(paramsSection).getByText('3.54')).toBeInTheDocument();
        expect(within(paramsSection).getByText('13.6% vol.')).toBeInTheDocument();

        // Production Journey Flowchart (grape variety, harvest date, fermentation, barrel duration, bottling date)
        const journeySection = screen.getByRole('region', {
            name: 'Production journey',
        });
        expect(within(journeySection).getByText('Regent')).toBeInTheDocument();
        expect(within(journeySection).getByText('2026-09-14')).toBeInTheDocument();
        expect(
            within(journeySection).getByText('2026-09-16 → 2026-10-01'),
        ).toBeInTheDocument();
        expect(
            within(journeySection).getByText('Hungarian Oak Barrel #3 (Barrel)'),
        ).toBeInTheDocument();
        expect(
            within(journeySection).getByText('1.7 month(s) (50 days)'),
        ).toBeInTheDocument();
        expect(within(journeySection).getByText('2026-11-20')).toBeInTheDocument();

        // Table of Nutrients (read-only)
        const nutrientsTable = screen.getByRole('table', {
            name: 'Table of nutrients',
        });
        expect(within(nutrientsTable).getByText('Energy value')).toBeInTheDocument();
        expect(within(nutrientsTable).getByText(/kJ \/ .* kcal/)).toBeInTheDocument();
        expect(within(nutrientsTable).getByText('Carbohydrates')).toBeInTheDocument();
        expect(within(nutrientsTable).getByText('of which: sugars')).toBeInTheDocument();
        expect(within(nutrientsTable).getByText('Protein')).toBeInTheDocument();
        expect(within(nutrientsTable).getByText('Salt')).toBeInTheDocument();
        expect(within(nutrientsTable).queryAllByRole('spinbutton')).toHaveLength(0);
    });

    it('gracefully hides broken vineyard logo on image error', async () => {
        const offering = await seedEstateBottleOffering();
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ message: 'Not found' }), {
                status: 404,
            })) as unknown as typeof fetch;

        render(CustomerBottleView, { props: { bottleId: offering.id } });

        const logoImg = await screen.findByRole('img', {
            name: 'Winnica Sandomierska logo',
        });
        expect(logoImg).toBeInTheDocument();

        await fireEvent.error(logoImg);
        expect(
            screen.queryByRole('img', { name: 'Winnica Sandomierska logo' }),
        ).not.toBeInTheDocument();
    });
});

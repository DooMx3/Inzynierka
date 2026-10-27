import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import ResultsTableHarness from './resultsTable.harness.svelte';

const rows = [
    { id: '1', name: 'First record' },
    { id: '2', name: 'Second record' },
];

describe('Results table', () => {
    it('renders each record through the supplied row', () => {
        render(ResultsTableHarness, { rows });

        expect(screen.getByRole('region', { name: 'Results' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByText('First record')).toBeInTheDocument();
        expect(screen.getByText('Second record')).toBeInTheDocument();
    });

    it('pages through records without knowing their columns', async () => {
        render(ResultsTableHarness, { rows, pageSize: 1 });

        expect(screen.getByText('First record')).toBeInTheDocument();
        expect(screen.queryByText('Second record')).not.toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        expect(screen.getByText('Second record')).toBeInTheDocument();
        expect(screen.queryByText('First record')).not.toBeInTheDocument();
    });

    it('shows an empty state', () => {
        render(ResultsTableHarness, { rows: [] });
        expect(screen.getByText('No results')).toBeInTheDocument();
    });
});

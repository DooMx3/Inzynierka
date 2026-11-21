import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import TableRowHarness from './tableRow.harness.svelte';

const rows = [
    { id: '1', name: 'Batch A', extra: 'Sugar 220 g/L' },
    { id: '2', name: 'Batch B' },
    { id: '3', name: 'Batch C', extra: 'Sugar 190 g/L' },
];

describe('TableRow', () => {
    it('expands and collapses details only when expanded', async () => {
        render(TableRowHarness, { rows });

        expect(screen.queryByText('Details for Batch A: Sugar 220 g/L')).not.toBeInTheDocument();
        const expandBtn = screen.getByRole('button', { name: 'Expand Batch A' });
        expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

        await fireEvent.click(expandBtn);
        expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Details for Batch A: Sugar 220 g/L')).toBeInTheDocument();

        await fireEvent.click(expandBtn);
        expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Details for Batch A: Sugar 220 g/L')).not.toBeInTheDocument();
    });

    it('omits expand button for rows without details and preserves logical striping', async () => {
        render(TableRowHarness, { rows });

        expect(screen.queryByRole('button', { name: 'Expand Batch B' })).not.toBeInTheDocument();

        const rowB = screen.getByText('Batch B').closest('tr');
        const rowC = screen.getByText('Batch C').closest('tr');
        expect(rowB).toHaveClass('bg-[#efe6dc]');
        expect(rowC).not.toHaveClass('bg-[#efe6dc]');

        await fireEvent.click(screen.getByRole('button', { name: 'Expand Batch A' }));
        expect(rowB).toHaveClass('bg-[#efe6dc]');
        expect(rowC).not.toHaveClass('bg-[#efe6dc]');
    });

    it('supports row checkbox selection', async () => {
        render(TableRowHarness, { rows });

        const checkbox = screen.getByRole('checkbox', { name: 'Select Batch A' });
        expect(checkbox).not.toBeChecked();

        await fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
    });
});

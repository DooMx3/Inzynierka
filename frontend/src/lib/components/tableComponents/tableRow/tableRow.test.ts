import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, mock } from 'bun:test';
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

    it('toggles expansion on cell click when expandOnRowClick is true and ignores interactive controls', async () => {
        render(TableRowHarness, { rows, expandOnRowClick: true });

        const cellA = screen.getByText('Batch A');
        const rowA = cellA.closest('tr');
        const rowB = screen.getByText('Batch B').closest('tr');

        expect(rowA).toHaveClass('cursor-pointer');
        expect(rowB).not.toHaveClass('cursor-pointer');
        expect(screen.queryByText('Details for Batch A: Sugar 220 g/L')).not.toBeInTheDocument();

        await fireEvent.click(cellA);
        expect(screen.getByText('Details for Batch A: Sugar 220 g/L')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Edit Batch A' }));
        expect(screen.getByText('Details for Batch A: Sugar 220 g/L')).toBeInTheDocument();

        const checkbox = screen.getByRole('checkbox', { name: 'Select Batch A' });
        await fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(screen.getByText('Details for Batch A: Sugar 220 g/L')).toBeInTheDocument();

        await fireEvent.click(cellA);
        expect(screen.queryByText('Details for Batch A: Sugar 220 g/L')).not.toBeInTheDocument();
    });

    it('applies highlighted styling, data attribute, rowId, and optional autoScrollWhenHighlighted', () => {
        const scrollMock = mock(() => {});
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollMock;

        try {
            render(TableRowHarness, {
                rows,
                highlightedId: '2',
                autoScrollWhenHighlighted: true,
            });

            const rowA = screen.getByText('Batch A').closest('tr');
            const rowB = screen.getByText('Batch B').closest('tr');

            expect(rowB).toHaveAttribute('id', 'row-2');
            expect(rowB).toHaveClass('bg-[#e9dccb]');
            expect(rowB).toHaveClass('ring-2');
            expect(rowB).toHaveClass('ring-inset');
            expect(rowB).toHaveClass('ring-[#6b4f3a]');
            expect(rowB).toHaveAttribute('data-highlighted', 'true');

            expect(rowA).not.toHaveAttribute('data-highlighted');
            expect(scrollMock).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
        } finally {
            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        }
    });
});

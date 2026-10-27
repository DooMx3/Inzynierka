import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import ResultsToolbar from './resultsToolbar.svelte';

describe('Results toolbar', () => {
    it('groups search, sort, filter and the search button', () => {
        render(ResultsToolbar);

        expect(screen.getByRole('search', { name: 'Results toolbar' })).toBeInTheDocument();
        expect(screen.getByText('Who are you looking for?')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search for first name, e-mail, role, etc.')).toBeInTheDocument();
        expect(screen.getByText('Sort by')).toBeInTheDocument();
        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });

    it('sends the typed query when search is clicked', async () => {
        let searched = 0;
        render(ResultsToolbar, {
            onSearch: () => {
                searched += 1;
            },
        });

        await fireEvent.input(screen.getByPlaceholderText('Search for first name, e-mail, role, etc.'), {
            target: { value: 'jane' },
        });
        await fireEvent.click(screen.getByRole('button', { name: /Search/i }));
        expect(searched).toBe(1);
    });
});

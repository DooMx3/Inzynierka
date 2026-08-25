import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SortBy from './sortBy.svelte';

describe('SortBy', () => {
    it('renders label "Sort by"', () => {
        render(SortBy);
        expect(screen.getByText('Sort by')).toBeInTheDocument();
    });

    it('renders dropdown input with trigger button', () => {
        render(SortBy);
        const trigger = screen.getByRole('button');
        expect(trigger).toBeInTheDocument();
    });

    it('renders sort icon and dropdown arrow icon', () => {
        const { container } = render(SortBy);
        const svgs = container.querySelectorAll('svg');
        expect(svgs).toHaveLength(2);

        const additionalIconSpan = container.querySelector('.additional-icon');
        expect(additionalIconSpan).toBeInTheDocument();
        expect(additionalIconSpan?.querySelector('svg')).toBeInTheDocument();
    });

    it('opens dropdown menu with sort options on click', async () => {
        const { container } = render(SortBy);
        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveTextContent('apple');
        expect(options[1]).toHaveTextContent('banana');
        expect(options[2]).toHaveTextContent('pear');
    });

    it('updates selected option when clicked', async () => {
        const { container } = render(SortBy);
        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);

        const bananaOption = screen.getByText('banana');
        await fireEvent.click(bananaOption);

        const label = container.querySelector('.dropdown-label');
        expect(label).toHaveTextContent('banana');
    });

    it('has flex column layout classes', () => {
        const { container } = render(SortBy);
        const wrapper = container.firstElementChild;
        expect(wrapper).toHaveClass('flex', 'items-center', 'flex-col', 'gap-2');
    });
});

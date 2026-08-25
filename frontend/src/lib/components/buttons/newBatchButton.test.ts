import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import NewBatchButton from './newBatchButton.svelte';

describe('NewBatchButton', () => {
    it('renders a button', () => {
        const { container } = render(NewBatchButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('has default text "Create new batch"', () => {
        render(NewBatchButton);
        const btn = screen.getByRole('button', { name: /Create new batch/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Create new batch');
    });

    it('renders with custom text', () => {
        render(NewBatchButton, { text: 'Add batch' });
        const btn = screen.getByRole('button', { name: /Add batch/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Add batch');
    });

    it('renders the new batch icon SVG', () => {
        const { container } = render(NewBatchButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(NewBatchButton, { onClick: () => { clicked = true; } });

        const btn = screen.getByRole('button', { name: /Create new batch/i });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('has gray background class', () => {
        const { container } = render(NewBatchButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('bg-gray-500');
    });

    it('has white text and fill classes', () => {
        const { container } = render(NewBatchButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('text-white', 'fill-white');
    });

    it('icon is to the left of the text', () => {
        const { container } = render(NewBatchButton);
        const btn = container.querySelector('button')!;
        const svgSpan = btn.firstElementChild;
        const textSpan = btn.children[1];

        expect(svgSpan?.querySelector('svg')).toBeInTheDocument();
        expect(textSpan).toHaveTextContent('Create new batch');
    });
});

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import CancelButton from './cancelButton.svelte';

describe('CancelButton', () => {
    it('renders a button', () => {
        const { container } = render(CancelButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('has default text "Cancel"', () => {
        render(CancelButton);
        const btn = screen.getByRole('button', { name: /Cancel/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Cancel');
    });

    it('renders with custom text', () => {
        render(CancelButton, { text: 'Discard' });
        const btn = screen.getByRole('button', { name: /Discard/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Discard');
    });

    it('renders the cancel icon SVG', () => {
        const { container } = render(CancelButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(CancelButton, { onClick: () => { clicked = true; } });

        const btn = screen.getByRole('button', { name: /Cancel/i });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('has red background class', () => {
        const { container } = render(CancelButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('bg-red-500');
    });

    it('has white text and fill classes', () => {
        const { container } = render(CancelButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('text-white', 'fill-white');
    });

    it('icon is to the left of the text', () => {
        const { container } = render(CancelButton);
        const btn = container.querySelector('button')!;
        const svgSpan = btn.firstElementChild;
        const textSpan = btn.children[1];

        expect(svgSpan?.querySelector('svg')).toBeInTheDocument();
        expect(textSpan).toHaveTextContent('Cancel');
    });
});

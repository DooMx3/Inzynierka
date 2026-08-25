import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import AcceptButton from './acceptButton.svelte';

describe('AcceptButton', () => {
    it('renders a button', () => {
        const { container } = render(AcceptButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('has default text "Confirm"', () => {
        render(AcceptButton);
        const btn = screen.getByRole('button', { name: /Confirm/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Confirm');
    });

    it('renders with custom text', () => {
        render(AcceptButton, { text: 'Save' });
        const btn = screen.getByRole('button', { name: /Save/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('Save');
    });

    it('renders the check icon SVG', () => {
        const { container } = render(AcceptButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(AcceptButton, { onClick: () => { clicked = true; } });

        const btn = screen.getByRole('button', { name: /Confirm/i });
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('has green background class', () => {
        const { container } = render(AcceptButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('bg-green-500');
    });

    it('has white text and fill classes', () => {
        const { container } = render(AcceptButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('text-white', 'fill-white');
    });

    it('icon is to the left of the text', () => {
        const { container } = render(AcceptButton);
        const btn = container.querySelector('button')!;
        const svgSpan = btn.firstElementChild;
        const textSpan = btn.children[1];

        expect(svgSpan?.querySelector('svg')).toBeInTheDocument();
        expect(textSpan).toHaveTextContent('Confirm');
    });
});

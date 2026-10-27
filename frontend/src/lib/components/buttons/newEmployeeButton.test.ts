import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import NewEmployeeButton from './newEmployeeButton.svelte';

describe('NewEmployeeButton', () => {
    it('renders a button', () => {
        const { container } = render(NewEmployeeButton);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('has default text "New employee"', () => {
        render(NewEmployeeButton);
        const btn = screen.getByRole('button', { name: /New employee/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent('New employee');
    });

    it('renders with custom text', () => {
        render(NewEmployeeButton, { text: 'Invite employee' });
        const btn = screen.getByRole('button', { name: /Invite employee/i });
        expect(btn).toHaveTextContent('Invite employee');
    });

    it('renders the person icon', () => {
        const { container } = render(NewEmployeeButton);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        let clicked = false;
        render(NewEmployeeButton, {
            onClick: () => {
                clicked = true;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /New employee/i }));
        expect(clicked).toBe(true);
    });

    it('uses the same stretched layout as the new batch button, in the app brown', () => {
        const { container } = render(NewEmployeeButton);
        const btn = container.querySelector('button');
        expect(btn).toHaveClass('bg-[#6b4f3a]', 'text-white', 'fill-white');
    });
});

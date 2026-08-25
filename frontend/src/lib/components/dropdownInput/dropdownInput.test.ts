import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import DropdownInput from './dropdownInput.svelte';
import sampleIcon from '$lib/assets/favicon.svg?raw';

describe('DropdownInput', () => {
    it('renders trigger button', () => {
        render(DropdownInput);
        const trigger = screen.getByRole('button');
        expect(trigger).toBeInTheDocument();
    });

    it('displays default placeholder "Number" on the trigger button', () => {
        const { container } = render(DropdownInput);
        const label = container.querySelector('.dropdown-label');
        expect(label).toHaveTextContent('Number');
    });

    it('displays custom placeholder on the trigger button', () => {
        const { container } = render(DropdownInput, { placeholder: 'Select fruit' });
        const label = container.querySelector('.dropdown-label');
        expect(label).toHaveTextContent('Select fruit');
    });

    it('renders dropdown arrow icon by default', () => {
        const { container } = render(DropdownInput);
        const arrow = container.querySelector('.dropdown-arrow svg');
        expect(arrow).toBeInTheDocument();
    });

    it('renders additional icon on the left when provided', () => {
        const { container } = render(DropdownInput, { additionalIcon: sampleIcon });
        const leftIcon = container.querySelector('.additional-icon svg');
        expect(leftIcon).toBeInTheDocument();
    });

    it('opens options menu on click and does NOT show placeholder in the options list', async () => {
        const options = ['apple', 'banana', 'pear'];
        const { container } = render(DropdownInput, { placeholder: 'Number', options });

        // Menu is initially closed
        expect(container.querySelector('.options-menu')).not.toBeInTheDocument();

        // Click trigger to open menu
        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);

        const menu = container.querySelector('.options-menu');
        expect(menu).toBeInTheDocument();
        expect(menu).toHaveClass('bg-zinc-700');

        // Check options inside the list
        const optionBtns = screen.getAllByRole('option');
        expect(optionBtns).toHaveLength(3);
        expect(optionBtns[0]).toHaveTextContent('apple');
        expect(optionBtns[1]).toHaveTextContent('banana');
        expect(optionBtns[2]).toHaveTextContent('pear');

        // Verify "Number" is NOT an option in the dropdown list
        const optionTexts = optionBtns.map((el) => el.textContent?.trim());
        expect(optionTexts).not.toContain('Number');
    });

    it('supports options passed as objects with value and label', async () => {
        const options = [
            { value: '1', label: 'Option One' },
            { value: '2', label: 'Option Two' },
        ];
        render(DropdownInput, { options });

        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);

        const optionBtns = screen.getAllByRole('option');
        expect(optionBtns).toHaveLength(2);
        expect(optionBtns[0]).toHaveTextContent('Option One');
        expect(optionBtns[1]).toHaveTextContent('Option Two');
    });

    it('selects option, updates label, closes menu and calls onchange', async () => {
        let selectedValue = '';
        const options = ['apple', 'banana', 'pear'];
        const { container } = render(DropdownInput, {
            options,
            onchange: (val) => { selectedValue = val; },
        });

        // Open menu
        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);

        // Click "banana"
        const bananaOption = screen.getByText('banana');
        await fireEvent.click(bananaOption);

        // Value updated and callback called
        expect(selectedValue).toBe('banana');
        const label = container.querySelector('.dropdown-label');
        expect(label).toHaveTextContent('banana');

        // Menu is closed after selection
        expect(container.querySelector('.options-menu')).not.toBeInTheDocument();
    });

    it('closes menu on Escape key press', async () => {
        const options = ['apple', 'banana'];
        const { container } = render(DropdownInput, { options });

        const trigger = screen.getByRole('button');
        await fireEvent.click(trigger);
        expect(container.querySelector('.options-menu')).toBeInTheDocument();

        await fireEvent.keyDown(window, { key: 'Escape' });
        expect(container.querySelector('.options-menu')).not.toBeInTheDocument();
    });

    it('handles disabled state', async () => {
        const options = ['apple', 'banana'];
        const { container } = render(DropdownInput, { options, disabled: true });

        const trigger = screen.getByRole('button');
        expect(trigger).toBeDisabled();

        await fireEvent.click(trigger);
        expect(container.querySelector('.options-menu')).not.toBeInTheDocument();
    });

    it('applies custom class to container', () => {
        const { container } = render(DropdownInput, { class: 'custom-dropdown-width' });
        const wrapper = container.querySelector('.dropdown-container');
        expect(wrapper).toHaveClass('custom-dropdown-width');
    });
});

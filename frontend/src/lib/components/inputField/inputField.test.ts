import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import InputField from './inputField.svelte';
import testSvg from '$lib/assets/favicon.svg?raw';

describe('Input field', () => {
    it('Check placeholder', () => {
        render(InputField, { placeholder: 'Enter your username' });

        const input = screen.getByPlaceholderText('Enter your username');
        expect(input).toBeInTheDocument();
    });

    it('Check label is present', () => {
        render(InputField, { label: 'Username', placeholder: 'Enter your username' });

        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('Check extra class', () => {
        const testingClass = 'mt-8';
        const { container } = render(InputField, {
            class: testingClass,
            placeholder: 'Enter your username',
        });

        expect(container.firstElementChild).toHaveClass(testingClass);
    });

    it('Check tailwind colors', () => {
        render(InputField, { placeholder: 'Enter your username' });

        const input = screen.getByPlaceholderText('Enter your username');
        const field = input.parentElement;

        expect(field).toHaveClass('bg-zinc-700', 'border-zinc-500', 'text-zinc-400', 'rounded-full');
        expect(input).toHaveClass('text-zinc-300', 'placeholder:text-zinc-500');
    });

    it('Check label position top', () => {
        const { container } = render(InputField, {
            label: 'Username',
            labelPosition: 'top',
            placeholder: 'Enter your username',
        });

        expect(container.firstElementChild).toHaveClass('flex-col');
        expect(container.firstElementChild).not.toHaveClass('flex-row');
    });

    it('Check label position left', () => {
        const { container } = render(InputField, {
            label: 'Username',
            labelPosition: 'left',
            placeholder: 'Enter your username',
        });

        expect(container.firstElementChild).toHaveClass('flex-row');
        expect(container.firstElementChild).not.toHaveClass('flex-col');
    });

    it('Check if svg is present', () => {
        const { container } = render(InputField, {
            svg: testSvg,
            placeholder: 'Enter your username',
        });

        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('Check svg is on the left of the input', () => {
        const { container } = render(InputField, {
            svg: testSvg,
            placeholder: 'Enter your username',
        });

        const input = screen.getByPlaceholderText('Enter your username');
        const field = input.parentElement;
        const svg = container.querySelector('svg');

        expect(field?.firstElementChild?.contains(svg)).toBe(true);
        expect(field?.lastElementChild).toBe(input);
    });

    it('Check svg is absent by default', () => {
        const { container } = render(InputField, { placeholder: 'Enter your username' });

        expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('Check typed value', async () => {
        render(InputField, { label: 'Username', placeholder: 'Enter your username' });

        const input = screen.getByLabelText('Username');
        await fireEvent.input(input, { target: { value: 'jan.kowalski' } });

        expect(input).toHaveValue('jan.kowalski');
    });

    it('Check input type', () => {
        render(InputField, { type: 'password', placeholder: 'Password' });

        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    });
});

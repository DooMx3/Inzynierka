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

        expect(field).toHaveClass('bg-white', 'border-[#c4b6a6]', 'text-zinc-700', 'rounded-full');
        expect(input).toHaveClass('text-zinc-800', 'placeholder:text-zinc-400');
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

    it('Check invalid field uses a red border and red text', () => {
        render(InputField, {
            label: 'Password',
            placeholder: 'Password',
            invalid: true,
        });

        const input = screen.getByLabelText('Password');
        const field = input.parentElement;

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveClass('text-red-700/80');
        expect(field).toHaveClass('border-red-500', 'text-red-700/80');
        expect(screen.getByText('Password')).toHaveClass('text-red-700/80');
    });

    it('Check input type', () => {
        render(InputField, { type: 'password', placeholder: 'Password' });

        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    });

    it('keeps non-password fields without a visibility toggle', () => {
        render(InputField, { label: 'Email', type: 'email', placeholder: 'Email' });

        expect(screen.queryByRole('button', { name: 'Show password' })).not.toBeInTheDocument();
    });

    it('reveals and hides a password from the visibility toggle', async () => {
        const { container } = render(InputField, {
            label: 'Password',
            type: 'password',
            placeholder: 'Password',
        });

        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');
        expect(container.querySelectorAll('path')).toHaveLength(3);

        await fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

        expect(input).toHaveAttribute('type', 'text');
        expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        await fireEvent.input(input, { target: { value: 'secret-pass' } });
        expect(input).toHaveValue('secret-pass');

        await fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));

        expect(input).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('forwards autocomplete and keydown to the input', async () => {
        let key = '';
        render(InputField, {
            label: 'Current password',
            type: 'password',
            autocomplete: 'current-password',
            onkeydown: (event: KeyboardEvent) => {
                key = event.key;
            },
        });

        const input = screen.getByLabelText('Current password');
        expect(input).toHaveAttribute('autocomplete', 'current-password');

        await fireEvent.keyDown(input, { key: 'Enter' });
        expect(key).toBe('Enter');
    });
});

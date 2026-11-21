import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import TextareaField from './textareaField.svelte';

describe('TextareaField', () => {
    it('renders label and binds typed text', async () => {
        render(TextareaField, {
            label: 'Description',
            placeholder: 'Enter notes',
            maxlength: 2000,
        });

        const textarea = screen.getByLabelText('Description');
        expect(textarea).toHaveAttribute('maxlength', '2000');

        await fireEvent.input(textarea, { target: { value: 'Powdery mildew on leaves' } });
        expect(textarea).toHaveValue('Powdery mildew on leaves');
    });

    it('applies invalid styling when invalid is true', () => {
        render(TextareaField, {
            label: 'Notes',
            invalid: true,
        });

        const textarea = screen.getByLabelText('Notes');
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Notes')).toHaveClass('text-red-700/80');
    });
});

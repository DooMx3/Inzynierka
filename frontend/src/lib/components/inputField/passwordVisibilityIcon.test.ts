import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import PasswordVisibilityIcon from './passwordVisibilityIcon.svelte';

describe('Password visibility icon', () => {
    it('shows an open eye while the password is hidden', () => {
        const { container } = render(PasswordVisibilityIcon, { concealed: false });
        const eye = container.querySelector('svg');

        expect(eye).toBeInTheDocument();
        expect(eye).not.toHaveClass('concealed');
        expect(eye?.querySelectorAll('path')).toHaveLength(3);
    });

    it('marks the eye as concealed while the password is visible', () => {
        const { container } = render(PasswordVisibilityIcon, { concealed: true });

        expect(container.querySelector('svg')).toHaveClass('concealed');
    });
});

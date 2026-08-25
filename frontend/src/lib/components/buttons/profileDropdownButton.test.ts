import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import ProfileDropdownButton from './profileDropdownButton.svelte';

describe('Profile dropdown button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(ProfileDropdownButton, { onClick: onClickFunction });
        const btn = screen.getByRole('button');
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if both svgs are present', () => {
        const { container } = render(ProfileDropdownButton);
        const svgs = container.querySelectorAll('svg');
        
        expect(svgs.length).toBe(4);
    });

    it('Check if the button text is the same as it should be', () => {
        render(ProfileDropdownButton, { accountName: 'Mariusz' });
        
        const btn = screen.getByRole('button', { name: 'Profile Dropdown' });
        expect(btn).toHaveTextContent('Mariusz');
    });
});

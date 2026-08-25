import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import PlannedTasksButton from './plannedTasksButton.svelte';

describe('Planned tasks button', () => {
    it('Check onClick function', async () => {
        let clicked = false;
        const onClickFunction = () => {
            clicked = true;
        };

        render(PlannedTasksButton, { onClick: onClickFunction });
        const btn = screen.getByRole('button');
        await fireEvent.click(btn);

        expect(clicked).toBe(true);
    });

    it('Check if svg is present', () => {
        const { container } = render(PlannedTasksButton);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });
});

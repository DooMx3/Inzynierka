import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import StatusBadge from './statusBadge.svelte';

describe('StatusBadge', () => {
    it('renders primary tone by default', () => {
        render(StatusBadge, { label: 'MUST' });
        const badge = screen.getByText('MUST');
        expect(badge).toHaveClass('bg-[#6b4f3a]', 'text-white');
    });

    it('renders danger tone for spoiled or destructive states', () => {
        render(StatusBadge, { label: 'SPOILED', tone: 'danger' });
        const badge = screen.getByText('SPOILED');
        expect(badge).toHaveClass('bg-[#8f3d32]', 'text-white');
    });
});

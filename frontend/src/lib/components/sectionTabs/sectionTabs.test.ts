import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import SectionTabs from './sectionTabs.svelte';

const tabs = [
    { label: 'Sprayings', href: '/agriculture/sprayings' },
    { label: 'Planned sprayings', href: '/agriculture/planned-sprayings', badge: 2 },
    { label: 'Harvests', href: '/agriculture/harvests' },
];

describe('SectionTabs', () => {
    it('marks the active tab with aria-current and renders badges', () => {
        render(SectionTabs, {
            tabs,
            currentPath: '/agriculture/planned-sprayings',
        });

        const active = screen.getByRole('link', { name: /Planned sprayings/i });
        const inactive = screen.getByRole('link', { name: 'Sprayings' });

        expect(active).toHaveAttribute('aria-current', 'page');
        expect(active).toHaveClass('bg-[#6b4f3a]', 'text-white');
        expect(inactive).not.toHaveAttribute('aria-current');
        expect(screen.getByText('2')).toBeInTheDocument();
    });
});

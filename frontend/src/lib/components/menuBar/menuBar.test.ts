import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import MenuBar from './menuBar.svelte';
import { menu } from '$lib/stores/menu.svelte';
import { setUser } from '$lib/stores/session.svelte';

const owner = {
    id: '1',
    firstname: 'Anna',
    lastname: 'Nowak',
    email: 'anna@example.com',
    roles: ['OWNER'],
};

const menuItems = [
    { name: 'Field work', path: '/agriculture' },
    { name: 'Vinery', path: '/vinery' },
    { name: 'Packed products', path: '/packed-products' },
    { name: 'Raports', path: '/raports' },
    { name: 'Workers', path: '/workers' },
];

const getSidebar = (container: HTMLElement) => container.firstElementChild as HTMLElement;

const getToggleButton = (container: HTMLElement) => {
    const toggle = getSidebar(container).querySelector(':scope > div > button');
    if (!(toggle instanceof HTMLButtonElement)) {
        throw new Error('Toggle button not found');
    }
    return toggle;
};

const getSpacer = (container: HTMLElement) =>
    getSidebar(container).querySelector(':scope > div > span:last-child') as HTMLElement;

describe('Menu bar', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        menu.folded = true;
        setUser(owner);
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: originalLocation,
        });
        menu.folded = true;
        setUser(null);
    });

    it('Check layout', () => {
        const { container } = render(MenuBar);

        expect(getSidebar(container)).toHaveClass(
            'flex',
            'flex-col',
            'gap-2',
            'w-72',
            'h-full',
            'p-2',
            'bg-[#f7f1ea]',
        );
        expect(getSidebar(container)).not.toHaveClass('rounded-lg');
    });

    it('Check starts folded', () => {
        const { container } = render(MenuBar);

        expect(getSidebar(container)).toHaveClass('!w-16');
        expect(getToggleButton(container)).not.toHaveClass('is-open');
        expect(getSpacer(container).style.flexGrow).toBe('1');
    });

    it('Check toggle expands the menu', async () => {
        const { container } = render(MenuBar);
        const toggle = getToggleButton(container);

        await fireEvent.click(toggle);

        expect(getSidebar(container)).not.toHaveClass('!w-16');
        expect(toggle).toHaveClass('is-open');
        expect(getSpacer(container).style.flexGrow).toBe('0');
    });

    it('Check toggle collapses the menu again', async () => {
        const { container } = render(MenuBar);
        const toggle = getToggleButton(container);

        await fireEvent.click(toggle);
        await fireEvent.click(toggle);

        expect(getSidebar(container)).toHaveClass('!w-16');
        expect(toggle).not.toHaveClass('is-open');
        expect(getSpacer(container).style.flexGrow).toBe('1');
    });

    it('Check toggle svg is present', () => {
        const { container } = render(MenuBar);
        const toggle = getToggleButton(container);

        expect(toggle.querySelector('svg')).toBeInTheDocument();
    });

    it('Check all menu items are present', () => {
        render(MenuBar);

        for (const item of menuItems) {
            expect(screen.getByRole('button', { name: item.name })).toBeInTheDocument();
        }
    });

    it('Check menu items are below the toggle', () => {
        const { container } = render(MenuBar);
        const sidebar = getSidebar(container);
        const itemsContainer = sidebar.children[1];

        expect(sidebar.children[0].querySelector('button')).toBe(getToggleButton(container));
        expect(itemsContainer.children).toHaveLength(menuItems.length);

        for (const item of menuItems) {
            expect(itemsContainer).toContainElement(
                screen.getByRole('button', { name: item.name }),
            );
        }
    });

    it('Check folded menu items hide labels', () => {
        render(MenuBar);

        const btn = screen.getByRole('button', { name: 'Field work' });
        const label = btn.querySelector('span.overflow-hidden');

        expect(btn).toHaveClass('w-12');
        expect(label).toHaveClass('max-w-0', 'opacity-0');
    });

    it('Check expanded menu items show labels', async () => {
        const { container } = render(MenuBar);

        await fireEvent.click(getToggleButton(container));

        const btn = screen.getByRole('button', { name: 'Field work' });
        const label = btn.querySelector('span.overflow-hidden');

        expect(btn).toHaveClass('w-full');
        expect(label).toHaveClass('max-w-40', 'opacity-100');
        expect(btn).toHaveTextContent('Field work');
    });

    it('Check menu item icons are present', () => {
        render(MenuBar);

        for (const item of menuItems) {
            const btn = screen.getByRole('button', { name: item.name });
            const icon = btn.querySelector('[role="img"]');

            expect(icon).toBeInTheDocument();
            expect(icon?.querySelector('svg')).toBeInTheDocument();
        }
    });

    it('Check menu item svg is on the left of the text', () => {
        render(MenuBar);

        const btn = screen.getByRole('button', { name: 'Field work' });
        const icon = btn.querySelector('[role="img"]');

        expect(btn.firstElementChild).toBe(icon);
        expect(btn.children[1]).toHaveTextContent('Field work');
    });

    it('shows field work to a vineyard worker and hides owner tools', () => {
        setUser({ ...owner, roles: ['WORKER'] });
        render(MenuBar);

        expect(screen.getByRole('button', { name: 'Field work' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Vinery' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Packed products' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Raports' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Workers' })).not.toBeInTheDocument();
    });

    it('shows winery tools to an oenologist and hides owner tools', () => {
        setUser({ ...owner, roles: ['OENOLOGIST'] });
        render(MenuBar);

        expect(screen.getByRole('button', { name: 'Field work' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vinery' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Packed products' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Raports' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Workers' })).not.toBeInTheDocument();
    });

    it('hides the whole sidebar when the account has no role', () => {
        setUser({ ...owner, roles: [] });
        const { container } = render(MenuBar);

        expect(container.querySelector('span.absolute')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        for (const item of menuItems) {
            expect(screen.queryByRole('button', { name: item.name })).not.toBeInTheDocument();
        }
    });

    it.each(menuItems)('Check $name navigates to $path', async ({ name, path }) => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: 'http://localhost/' },
        });
        render(MenuBar);

        await fireEvent.click(screen.getByRole('button', { name }));

        expect(window.location.href).toBe(path);
    });
});

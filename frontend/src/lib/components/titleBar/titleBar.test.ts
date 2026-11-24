import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import TitleBar from './titleBar.svelte';
import { menu } from '$lib/stores/menu.svelte';
import { setUser } from '$lib/stores/session.svelte';

describe('Title bar', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        window.location.href = 'http://localhost/';
        menu.folded = true;
        globalThis.fetch = (async () => new Response('[]', { status: 200 })) as unknown as typeof fetch;
        setUser({
            id: '1',
            firstname: 'Henryk',
            lastname: 'Kowalski',
            email: 'henryk@example.com',
            roles: ['OWNER'],
        });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.location.href = 'http://localhost/';
        menu.folded = true;
        setUser(null);
    });

    it('Check logo is present', () => {
        render(TitleBar);

        const logo = screen.getByAltText('Logo');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src');
        expect(logo.getAttribute('src')).not.toBe('../../assets/logo.webp');
        expect(logo.getAttribute('src')).toMatch(/logo/i);
    });

    it('Check logo is imported as an asset', () => {
        render(TitleBar);

        const src = screen.getByAltText('Logo').getAttribute('src') ?? '';
        expect(src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')).toBe(true);
    });

    it('Check app name is Vinery and links to /', () => {
        render(TitleBar);

        const brandName = screen.getByText('Vinery');
        expect(brandName).toBeInTheDocument();
        expect(brandName.closest('a')).toHaveAttribute('href', '/');
    });

    it('Check logo is on the left of the app name', () => {
        render(TitleBar);

        const logo = screen.getByAltText('Logo');
        const name = screen.getByText('Vinery');
        const brandLink = name.closest('a');

        expect(brandLink?.firstElementChild).toBe(logo);
        expect(brandLink?.lastElementChild).toBe(name);
    });

    it('Check layout with responsive height', () => {
        const { container } = render(TitleBar);

        expect(container.firstElementChild).toHaveClass(
            'flex',
            'items-center',
            'justify-center',
            'h-16',
            'sm:h-24',
            'w-full',
            'bg-[#eae0d5]',
        );
    });

    it('Check three columns', () => {
        const { container } = render(TitleBar);
        const columns = container.firstElementChild?.children;

        expect(columns).toHaveLength(3);
        expect(columns?.[0]).toHaveClass('w-1/3', 'justify-start');
        expect(columns?.[1]).toHaveClass('w-1/3', 'justify-center');
        expect(columns?.[2]).toHaveClass('w-1/3', 'justify-end');
    });

    it('toggles mobile navigation drawer via hamburger button', async () => {
        render(TitleBar);

        const hamburger = screen.getByRole('button', { name: 'Toggle navigation menu' });
        expect(menu.folded).toBe(true);

        await fireEvent.click(hamburger);
        expect(menu.folded).toBe(false);

        await fireEvent.click(hamburger);
        expect(menu.folded).toBe(true);
    });

    it('filters role-aware quick navigation destinations in search and navigates on Enter', async () => {
        render(TitleBar);

        const input = screen.getByPlaceholderText('Search');
        await fireEvent.input(input, { target: { value: 'offerings' } });

        const listbox = screen.getByRole('listbox', { name: 'Quick navigation results' });
        expect(listbox).toHaveTextContent('Offerings');
        expect(listbox).toHaveTextContent('/management/offerings');

        await fireEvent.keyDown(input, { key: 'Enter' });
        expect(window.location.pathname).toBe('/management/offerings');
    });

    it('Check profile dropdown is on the right', () => {
        const { container } = render(TitleBar);

        const right = container.firstElementChild?.children[2];
        const btn = screen.getByRole('button', { name: 'Profile Dropdown' });

        expect(right).toContainElement(btn);
    });

    it('renders Tasks button with planned count badge for vineyard members and hides it for unassigned users', async () => {
        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify([
                    {
                        id: 't-1',
                        type: 'GENERAL',
                        name: 'Inspect barrels',
                        completed: false,
                    },
                    {
                        id: 't-2',
                        type: 'GENERAL',
                        name: 'Clean press',
                        completed: false,
                    },
                ]),
                { status: 200 },
            )) as unknown as typeof fetch;

        const { container, unmount } = render(TitleBar);

        const right = container.firstElementChild?.children[2];
        const tasksBtn = screen.getByRole('button', { name: 'Tasks' });
        const profileBtn = screen.getByRole('button', { name: 'Profile Dropdown' });

        expect(right).toContainElement(tasksBtn);
        expect(Boolean(tasksBtn.compareDocumentPosition(profileBtn) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

        await waitFor(() => {
            expect(screen.getByTestId('tasks-planned-badge')).toHaveTextContent('2');
        });

        await fireEvent.click(tasksBtn);
        expect(window.location.pathname).toBe('/tasks');
        unmount();

        // Signed-in user without a vineyard role should not see Tasks or Hamburger buttons
        setUser({
            id: '2',
            firstname: 'Nowy',
            lastname: 'Uzytkownik',
            email: 'nowy@example.com',
            roles: [],
        });
        render(TitleBar);
        expect(screen.queryByRole('button', { name: 'Tasks' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Toggle navigation menu' }),
        ).not.toBeInTheDocument();
    });

    it('highlights Tasks button when active on /tasks route', () => {
        window.location.href = 'http://localhost/tasks';
        render(TitleBar);

        const tasksBtn = screen.getByRole('button', { name: 'Tasks' });
        expect(tasksBtn).toHaveClass('bg-[#6b4f3a]', 'text-white');
    });

    it('does not render an Offerings button in the top bar for signed-in or signed-out users', () => {
        const { unmount } = render(TitleBar);
        expect(screen.queryByRole('link', { name: 'Offerings' })).not.toBeInTheDocument();
        unmount();

        setUser(null);
        render(TitleBar);
        expect(screen.queryByRole('link', { name: 'Offerings' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Tasks' })).not.toBeInTheDocument();
    });

    it('hides the profile dropdown until someone signs in', () => {
        setUser(null);
        render(TitleBar);

        expect(screen.queryByRole('button', { name: 'Profile Dropdown' })).not.toBeInTheDocument();
        expect(screen.queryByRole('searchbox', { name: 'Search' })).not.toBeInTheDocument();
        const signIn = screen.getByRole('link', { name: 'Sign in' });
        expect(signIn).toHaveAttribute('href', '/auth');
        expect(signIn.querySelector('svg')).toBeInTheDocument();
        expect(signIn).toHaveClass('bg-[#e4d3c0]', 'text-[#4a3428]', 'transition-colors', 'duration-200');
    });

    it('hides search on a phone even after signing in', () => {
        const original = window.matchMedia;
        window.matchMedia = ((query: string) => ({
            matches: query.includes('max-width'),
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
            onchange: null,
        })) as unknown as typeof window.matchMedia;

        try {
            render(TitleBar);

            expect(screen.queryByRole('searchbox', { name: 'Search' })).not.toBeInTheDocument();
            expect(screen.getByText('Vinery')).toHaveClass('whitespace-nowrap');
            expect(screen.getByRole('button', { name: 'Profile Dropdown' })).toBeInTheDocument();
        } finally {
            window.matchMedia = original;
        }
    });
});

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import UserHome from './userHome.svelte';
import { setUser } from '$lib/stores/session.svelte';

describe('User home', () => {
    beforeEach(() => {
        setUser(null);
    });

    afterEach(() => {
        setUser(null);
    });

    it('hides the user menu when nobody is signed in', () => {
        render(UserHome);

        expect(screen.queryByRole('region', { name: 'User menu' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /vineyard/i })).not.toBeInTheDocument();
        expect(screen.getByText('Sign in to see your menu.')).toBeInTheDocument();
    });

    it('shows the user menu for a signed-in user', () => {
        setUser({ id: '1', firstname: 'Anna', email: 'anna@example.com' });
        render(UserHome);

        expect(screen.getByRole('region', { name: 'User menu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create new vineyard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invited/i })).toBeInTheDocument();
    });
});

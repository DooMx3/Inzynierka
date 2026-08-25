import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import { createRawSnippet } from 'svelte';
import FormWindow from './formWindow.svelte';

describe('FormWindow', () => {
    it('renders dialog overlay centered on page', () => {
        render(FormWindow);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveClass('fixed', 'inset-0', 'flex', 'items-center', 'justify-center');
    });

    it('renders top-right close button with icon and aria-label', () => {
        render(FormWindow);
        const closeBtn = screen.getByRole('button', { name: 'Close' });
        expect(closeBtn).toBeInTheDocument();
        expect(closeBtn.querySelector('svg')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
        let closed = false;
        render(FormWindow, { onClose: () => { closed = true; } });

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        await fireEvent.click(closeBtn);

        expect(closed).toBe(true);
    });

    it('renders cancel and accept buttons with default labels at bottom', () => {
        render(FormWindow);
        const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
        const acceptBtn = screen.getByRole('button', { name: 'Confirm' });

        expect(cancelBtn).toBeInTheDocument();
        expect(acceptBtn).toBeInTheDocument();
    });

    it('supports custom labels for cancel and accept buttons', () => {
        render(FormWindow, { cancelText: 'Discard', acceptText: 'Submit' });
        expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
        let cancelled = false;
        render(FormWindow, { onCancel: () => { cancelled = true; } });

        const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
        await fireEvent.click(cancelBtn);

        expect(cancelled).toBe(true);
    });

    it('calls onAccept when accept button is clicked', async () => {
        let accepted = false;
        render(FormWindow, { onAccept: () => { accepted = true; } });

        const acceptBtn = screen.getByRole('button', { name: 'Confirm' });
        await fireEvent.click(acceptBtn);

        expect(accepted).toBe(true);
    });

    it('renders breadcrumbs and title in top-left section', () => {
        const { container } = render(FormWindow, {
            title: 'New Vineyard Form',
            additionalCrumbs: ['Forms', 'Create'],
        });

        expect(screen.getByText('New Vineyard Form')).toBeInTheDocument();
        expect(container).toHaveTextContent('Forms / Create');
    });

    it('renders breadcrumbs above title in top-left column', () => {
        render(FormWindow, {
            title: 'Sample Title',
            additionalCrumbs: ['Parent'],
        });

        const titleEl = screen.getByText('Sample Title');
        const headerSection = titleEl.parentElement;
        expect(headerSection).toBeInTheDocument();
        expect(headerSection).toHaveClass('flex', 'flex-col');
        expect(headerSection?.firstElementChild).not.toBe(titleEl);
        expect(headerSection?.lastElementChild).toBe(titleEl);
    });

    it('renders action buttons in bottom-right footer', () => {
        render(FormWindow);
        const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
        const footer = cancelBtn.closest('div');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveClass('justify-end');
    });

    it('renders child form content correctly using children snippet', () => {
        const children = createRawSnippet(() => ({
            render: () => '<form data-testid="test-form"><label for="username">Username</label><input id="username" name="username" /></form>',
        }));

        render(FormWindow, { title: 'Test Form', children });

        const form = screen.getByTestId('test-form');
        expect(form).toBeInTheDocument();
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('applies custom class to modal container', () => {
        const { container } = render(FormWindow, { class: 'custom-modal-class' });
        const modal = container.querySelector('.custom-modal-class');
        expect(modal).toBeInTheDocument();
    });
});

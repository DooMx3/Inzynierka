import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import ConfirmationDialog from './confirmationDialog.svelte';

describe('ConfirmationDialog', () => {
    it('renders dialog overlay', () => {
        render(ConfirmationDialog, { text: 'Are you sure?' });
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
    });

    it('has default title "Confirmation dialog"', () => {
        render(ConfirmationDialog, { text: 'Confirm action' });
        expect(screen.getByText('Confirmation dialog')).toBeInTheDocument();
    });

    it('allows overriding title prop', () => {
        render(ConfirmationDialog, { title: 'Delete Item', text: 'Are you sure you want to delete?' });
        expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    it('renders text content inside a span element', () => {
        const { container } = render(ConfirmationDialog, { text: 'Do you really want to proceed?' });
        const textSpan = screen.getByText('Do you really want to proceed?');
        expect(textSpan).toBeInTheDocument();
        expect(textSpan.tagName.toLowerCase()).toBe('span');
    });

    it('does not render breadcrumbs in the header', () => {
        const { container } = render(ConfirmationDialog, { text: 'No breadcrumbs expected' });
        const titleEl = screen.getByText('Confirmation dialog');
        const headerCol = titleEl.parentElement;
        expect(headerCol?.children).toHaveLength(1);
        expect(headerCol?.firstElementChild).toBe(titleEl);
    });

    it('renders close button in top-right and handles onClose', async () => {
        let closed = false;
        render(ConfirmationDialog, {
            text: 'Test close',
            onClose: () => { closed = true; },
        });

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        expect(closeBtn).toBeInTheDocument();
        await fireEvent.click(closeBtn);

        expect(closed).toBe(true);
    });

    it('renders default action buttons Cancel and Confirm', () => {
        render(ConfirmationDialog, { text: 'Test action buttons' });
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('supports custom text for action buttons', () => {
        render(ConfirmationDialog, {
            text: 'Custom buttons',
            cancelText: 'No, return',
            acceptText: 'Yes, proceed',
        });

        expect(screen.getByRole('button', { name: 'No, return' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Yes, proceed' })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
        let cancelled = false;
        render(ConfirmationDialog, {
            text: 'Test cancel',
            onCancel: () => { cancelled = true; },
        });

        const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
        await fireEvent.click(cancelBtn);

        expect(cancelled).toBe(true);
    });

    it('calls onAccept when confirm button is clicked', async () => {
        let accepted = false;
        render(ConfirmationDialog, {
            text: 'Test accept',
            onAccept: () => { accepted = true; },
        });

        const acceptBtn = screen.getByRole('button', { name: 'Confirm' });
        await fireEvent.click(acceptBtn);

        expect(accepted).toBe(true);
    });

    it('applies custom class to modal container', () => {
        const { container } = render(ConfirmationDialog, {
            text: 'Test class',
            class: 'custom-dialog-class',
        });

        const modal = container.querySelector('.custom-dialog-class');
        expect(modal).toBeInTheDocument();
    });
});

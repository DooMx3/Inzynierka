import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, mock } from 'bun:test';
import QrCodeModal from './qrCodeModal.svelte';

describe('QrCodeModal', () => {
    it('renders QR preview along with Download PNG, Download SVG, Print, and OK actions', async () => {
        const onClose = mock(() => {});
        render(QrCodeModal, {
            title: 'Bottle QR',
            subtitle: 'Solaris 2026',
            targetUrl: 'https://vineyard.local/offerings/550e8400-e29b-41d4-a716-446655440000',
            onClose,
        });

        await screen.findByTestId('qr-svg-preview');
        expect(screen.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download SVG' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'OK' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

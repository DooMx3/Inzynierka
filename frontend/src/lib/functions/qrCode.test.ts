import { describe, it, expect } from 'bun:test';
import { generateQrSvg, svgToDataUri } from './qrCode';

describe('qrCode generator helper', () => {
    it('generates valid SVG markup and data URI for a target URL', async () => {
        const svg = await generateQrSvg('https://vineyard.local/offerings/off-1');
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');

        const uri = svgToDataUri(svg);
        expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    });

    it('rejects empty QR payloads', async () => {
        await expect(generateQrSvg('   ')).rejects.toThrow('Cannot generate QR code');
    });
});

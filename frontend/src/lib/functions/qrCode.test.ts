import { describe, it, expect } from 'bun:test';
import { generateQrPngDataUrl, generateQrSvg, svgToDataUri } from './qrCode';

describe('qrCode generator helper', () => {
    it('generates valid SVG markup and data URI for a target URL', async () => {
        const svg = await generateQrSvg('https://vineyard.local/offerings/off-1');
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');

        const uri = svgToDataUri(svg);
        expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    });

    it('generates valid PNG data URL for a target URL', async () => {
        const pngDataUrl = await generateQrPngDataUrl('https://vineyard.local/offerings/off-1');
        expect(pngDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('rejects empty QR payloads', async () => {
        await expect(generateQrSvg('   ')).rejects.toThrow('Cannot generate QR code');
        await expect(generateQrPngDataUrl('   ')).rejects.toThrow('Cannot generate QR code');
    });
});

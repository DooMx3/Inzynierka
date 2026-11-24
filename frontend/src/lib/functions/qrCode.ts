import QRCode from 'qrcode';

export const generateQrSvg = async (value: string): Promise<string> => {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error('Cannot generate QR code for an empty value.');
    }
    return QRCode.toString(trimmed, {
        type: 'svg',
        margin: 2,
        width: 260,
        color: {
            dark: '#231810',
            light: '#ffffff',
        },
    });
};

export const svgToDataUri = (svgMarkup: string): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

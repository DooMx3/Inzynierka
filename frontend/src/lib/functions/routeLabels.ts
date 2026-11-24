const UUID_SEGMENT_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SPECIAL_SEGMENT_LABELS: Record<string, string> = {
    qr: 'QR',
    'qr-codes': 'QR Codes',
};

export const formatSegmentLabel = (segment: string): string => {
    if (!segment) {
        return '';
    }
    const lower = segment.toLowerCase();
    if (SPECIAL_SEGMENT_LABELS[lower]) {
        return SPECIAL_SEGMENT_LABELS[lower]!;
    }
    if (UUID_SEGMENT_REGEX.test(segment)) {
        return 'Details';
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
};

export const resolveBreadcrumbSegments = (
    pathname: string,
    additionalCrumbs: string[] = [],
): string[] => {
    const rawSegments = pathname.split('/').filter((segment) => segment !== '');

    let formattedPathSegments: string[];
    if (
        rawSegments.length === 3 &&
        rawSegments[0] === 'offerings' &&
        rawSegments[1] === 'vineyard' &&
        UUID_SEGMENT_REGEX.test(rawSegments[2]!)
    ) {
        formattedPathSegments = ['Offerings', 'Vineyard'];
    } else if (
        rawSegments.length === 2 &&
        rawSegments[0] === 'offerings' &&
        UUID_SEGMENT_REGEX.test(rawSegments[1]!)
    ) {
        formattedPathSegments = ['Offerings', 'Wine Details'];
    } else if (
        rawSegments.length === 3 &&
        rawSegments[0] === 'qr' &&
        rawSegments[1] === 'equipment' &&
        UUID_SEGMENT_REGEX.test(rawSegments[2]!)
    ) {
        formattedPathSegments = ['QR', 'Equipment'];
    } else {
        formattedPathSegments = rawSegments.map(formatSegmentLabel);
    }

    const formattedExtra = additionalCrumbs.map((crumb) =>
        crumb ? crumb.charAt(0).toUpperCase() + crumb.slice(1) : '',
    );

    return [...formattedPathSegments, ...formattedExtra].filter(Boolean);
};

export const resolveSubpageTitle = (pathname: string): string => {
    const rawSegments = pathname.split('/').filter((segment) => segment !== '');
    if (rawSegments.length === 0) {
        return '';
    }

    if (
        rawSegments.length === 3 &&
        rawSegments[0] === 'offerings' &&
        rawSegments[1] === 'vineyard' &&
        UUID_SEGMENT_REGEX.test(rawSegments[2]!)
    ) {
        return 'Vineyard Offerings';
    }

    if (
        rawSegments.length === 2 &&
        rawSegments[0] === 'offerings' &&
        UUID_SEGMENT_REGEX.test(rawSegments[1]!)
    ) {
        return 'Wine Details';
    }

    if (
        rawSegments.length === 3 &&
        rawSegments[0] === 'qr' &&
        rawSegments[1] === 'equipment' &&
        UUID_SEGMENT_REGEX.test(rawSegments[2]!)
    ) {
        return 'Equipment QR';
    }

    return formatSegmentLabel(rawSegments.at(-1)!);
};

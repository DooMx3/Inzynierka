import { describe, it, expect } from 'bun:test';
import { createDraft, getOrganisationMessages, formatDisplayValue } from './userHomeHelpers';

describe('userHomeHelpers', () => {
    it('creates trimmed draft object', () => {
        const draft = createDraft('  Vineyard  ', '  City  ', '  Street  ', '  00-000  ', '  123  ', '  Motto  ');
        expect(draft).toEqual({
            name: 'Vineyard',
            city: 'City',
            street: 'Street',
            postalCode: '00-000',
            taxId: '123',
            motto: 'Motto',
        });
    });

    it('returns validation messages for missing name or city', () => {
        expect(getOrganisationMessages('', '  ')).toEqual([
            'Enter the organisation name.',
            'Enter the city.',
        ]);
        expect(getOrganisationMessages('Vineyard', 'City')).toEqual([]);
    });

    it('formats display value correctly', () => {
        expect(formatDisplayValue('  Anna  ')).toBe('Anna');
        expect(formatDisplayValue('   ')).toBe('Not set');
        expect(formatDisplayValue(null)).toBe('Not set');
        expect(formatDisplayValue(undefined)).toBe('Not set');
    });
});

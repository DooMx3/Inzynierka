import { describe, it, expect } from 'bun:test';
import { roleLabel } from './employee';

describe('Employee role labels', () => {
    it('names the vineyard roles in the interface language', () => {
        expect(roleLabel('WORKER')).toBe('Vineyard Worker');
        expect(roleLabel('OENOLOGIST')).toBe('Oenologist');
        expect(roleLabel('OWNER')).toBe('Owner');
    });

    it('keeps an unknown role readable', () => {
        expect(roleLabel('GUEST')).toBe('GUEST');
    });
});

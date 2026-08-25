import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import { flushSync } from 'svelte';
import PasswordConditionsIndicator from './passwordConditionsIndicator.svelte';

describe('Password conditions indicator', () => {
    it('Check extra class', () => {
        const testingClass = 'mt-8';
        const { container } = render(PasswordConditionsIndicator, {
            password: 'password123',
            class: testingClass,
        });
        flushSync();

        expect(container.firstElementChild).toHaveClass(testingClass);
    });

    it('Check conditions count matches password conditions', () => {
        const password = '12345';
        const { container } = render(PasswordConditionsIndicator, {
            password,
        });
        flushSync();

        const conditions = container.querySelectorAll('li');
        expect(conditions.length).toBeGreaterThan(4);
    });

    it('Check conditions are valid or invalid', () => {
        const password = 'Str0ngP@ssw0rd!';
        const { container } = render(PasswordConditionsIndicator, {
            password,
        });
        flushSync();

        const conditions = container.querySelectorAll('li');
        expect(conditions.length).toBeGreaterThan(0);

        conditions.forEach((condition) => {
            expect(condition.querySelector('svg')).toBeTruthy();
            expect(condition.querySelector('span')).toBeTruthy();
        });
    });
});

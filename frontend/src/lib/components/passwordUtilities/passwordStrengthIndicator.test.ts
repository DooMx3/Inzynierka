import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import { flushSync } from 'svelte';
import PasswordStrengthIndicator from './passwordStrengthIndicator.svelte';
import { checkPasswordStrength } from '$lib/functions/passwordStrengthChecker';

const BAR_COLORS = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400'];

const renderIndicator = (password: string, userInput: string[] = [], extraClass?: string) => {
    const result = render(PasswordStrengthIndicator, {
        password,
        userInput,
        ...(extraClass ? { class: extraClass } : {}),
    });
    flushSync();
    return result;
};

const getBars = (container: HTMLElement) => {
    return Array.from(container.firstElementChild?.children ?? []);
};

describe('Password strength indicator', () => {
    it('Check extra class', () => {
        const testingClass = 'mt-8';
        const { container } = renderIndicator('password123', [], testingClass);

        expect(container.firstElementChild).toHaveClass(testingClass);
    });

    it('Check wrapper layout', () => {
        const { container } = renderIndicator('password123');

        expect(container.firstElementChild).toHaveClass('flex', 'gap-1');
    });

    it('Check bar count matches password score', () => {
        const password = '12345';
        const userInput: string[] = [];
        const { score } = checkPasswordStrength(password, userInput);
        const { container } = renderIndicator(password, userInput);

        expect(getBars(container)).toHaveLength(score + 1);
    });

    it('Check tailwind colors', () => {
        const password = 'Str0ngP@ssw0rd!';
        const userInput: string[] = [];
        const { score } = checkPasswordStrength(password, userInput);
        const { container } = renderIndicator(password, userInput);
        const bars = getBars(container);

        expect(bars.length).toBeGreaterThan(0);

        bars.forEach((bar, index) => {
            expect(bar).toHaveClass('w-8', 'h-3', 'rounded-lg', BAR_COLORS[index]);
        });

        expect(bars).toHaveLength(score + 1);
    });

    it('Check more bars for a stronger password', () => {
        const weak = renderIndicator('12345');
        const strong = renderIndicator('Str0ngP@ssw0rd!');

        expect(getBars(strong.container).length).toBeGreaterThan(getBars(weak.container).length);
    });

    it('Check fewer bars when password includes user input', () => {
        const password = 'userpassword';
        const withoutUserInput = renderIndicator(password, []);
        const withUserInput = renderIndicator(password, ['user', 'password']);

        expect(getBars(withUserInput.container).length).toBeLessThanOrEqual(
            getBars(withoutUserInput.container).length,
        );
    });
});

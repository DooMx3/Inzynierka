import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'bun:test';
import PotassiumCalculatorModal from './potassiumCalculatorModal.svelte';
import PredictedAlcoholModal from './predictedAlcoholModal.svelte';

describe('Calculator modals', () => {
    it('calculates potassium metabisulfite and lets oenologist override dose manually', async () => {
        let applied = 0;
        render(PotassiumCalculatorModal, {
            volumeLiters: 200,
            initialPh: 3.4,
            onApplyDose: (grams: number) => {
                applied = grams;
            },
        });

        expect(screen.getByText(/Formula: K2S2O5 \[g\]/)).toBeInTheDocument();

        const overrideInput = screen.getByLabelText(/Final potassium metabisulfite dose/i);
        await fireEvent.input(overrideInput, { target: { value: '24.5' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Apply dose' }));

        expect(applied).toBe(24.5);
    });

    it('updates predicted alcohol and required chaptalization sugar interactively', async () => {
        render(PredictedAlcoholModal, {
            volumeLiters: 100,
            initialSugarGL: 170,
            initialAddedSugarGrams: 0,
        });

        expect(screen.getByText(/10.1% vol/)).toBeInTheDocument();

        await fireEvent.input(screen.getByLabelText('Added sugar (g)'), {
            target: { value: '3000' },
        });
        expect(screen.getByText(/11.88% vol/)).toBeInTheDocument();
    });
});

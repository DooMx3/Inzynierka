<script lang="ts">
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import { calculatePotassiumMetabisulfite } from "$lib/functions/calculators";

    let {
        volumeLiters = 100,
        initialPh = null,
        onClose = () => {},
        onApplyDose,
    }: {
        volumeLiters?: number;
        initialPh?: number | null;
        onClose?: () => void;
        onApplyDose?: (grams: number) => void;
    } = $props();

    let volumeStr = $derived<string | number | null>(String(volumeLiters));
    let phStr = $derived<string | number | null>(initialPh != null ? String(initialPh) : "");
    let currentSo2Str = $state<string | number | null>("0");
    let customTargetSo2Str = $state<string | number | null>("");
    let stopFermentation = $state(true);
    let manualDoseOverride = $state<string | number | null>("");

    const hasText = (val: string | number | null | undefined) =>
        String(val ?? "").trim() !== "";

    const calculation = $derived.by(() => {
        const vol = Number(volumeStr) || 0;
        const pH = hasText(phStr) ? Number(phStr) : null;
        const currentSo2 = Number(currentSo2Str) || 0;
        const customTarget = hasText(customTargetSo2Str) ? Number(customTargetSo2Str) : undefined;
        return calculatePotassiumMetabisulfite({
            volumeLiters: vol,
            pH,
            currentFreeSo2MgL: currentSo2,
            targetFreeSo2MgL: customTarget,
            stopFermentation,
        });
    });

    const effectiveGrams = $derived(
        hasText(manualDoseOverride)
            ? Math.max(0, Number(manualDoseOverride) || 0)
            : calculation.gramsPotassiumMetabisulfite,
    );

    const handleConfirm = () => {
        if (onApplyDose) {
            onApplyDose(effectiveGrams);
        }
        onClose();
    };
</script>

<FormWindow
    title="Potassium metabisulfite calculator"
    showBreadcrumbs={false}
    acceptText={onApplyDose ? "Apply dose" : "Done"}
    showCancel={Boolean(onApplyDose)}
    onClose={onClose}
    onCancel={onClose}
    onAccept={handleConfirm}
>
    <div class="flex flex-col gap-4 text-zinc-800">
        <div class="grid gap-3 sm:grid-cols-2">
            <InputField
                label="Batch volume (L)"
                type="number"
                min={0.1}
                step={0.1}
                bind:value={volumeStr}
            />
            <InputField
                label="Wine / must pH (optional)"
                type="number"
                min={2.8}
                max={4.2}
                step={0.01}
                placeholder="e.g. 3.40"
                bind:value={phStr}
            />
            <InputField
                label="Current free SO2 (mg/L)"
                type="number"
                min={0}
                step={1}
                bind:value={currentSo2Str}
            />
            <InputField
                label="Target free SO2 override (mg/L)"
                type="number"
                min={0}
                step={1}
                placeholder={`Auto: ${calculation.effectiveTargetFreeSo2MgL} mg/L`}
                bind:value={customTargetSo2Str}
            />
        </div>

        <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-3 text-sm"
        >
            <input
                type="checkbox"
                class="h-4 w-4 accent-[#6b4f3a]"
                bind:checked={stopFermentation}
            />
            <span class="font-medium text-[#3f2e22]">
                Stop active fermentation dosage (higher molecular SO2 target)
            </span>
        </label>

        <div class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="text-sm font-medium text-zinc-600">Calculated K2S2O5 dosage:</span>
                <span class="text-2xl font-bold text-[#3f2e22]">
                    {calculation.gramsPotassiumMetabisulfite} g
                </span>
            </div>
            <p class="mt-2 font-mono text-xs text-zinc-600">
                Formula: {calculation.formula}
            </p>
        </div>

        <InputField
            label="Final potassium metabisulfite dose (g) — editable"
            type="number"
            min={0}
            step={0.01}
            placeholder={String(calculation.gramsPotassiumMetabisulfite)}
            bind:value={manualDoseOverride}
        />
    </div>
</FormWindow>

<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import { calculatePredictedAlcohol, YEAST_STRAINS } from "$lib/functions/calculators";

    let {
        volumeLiters = 100,
        initialSugarGL = 200,
        initialAddedSugarGrams = 0,
        initialYeastId = "EC1118",
        onClose = () => {},
    }: {
        volumeLiters?: number;
        initialSugarGL?: number;
        initialAddedSugarGrams?: number;
        initialYeastId?: string;
        onClose?: () => void;
    } = $props();

    let volumeStr = $derived<string | number | null>(String(volumeLiters));
    let fruitSugarStr = $derived<string | number | null>(String(initialSugarGL));
    let addedSugarStr = $derived<string | number | null>(String(initialAddedSugarGrams));
    let yeastId = $derived(initialYeastId);
    let desiredAbvStr = $state<string | number | null>("12.5");

    const result = $derived(
        calculatePredictedAlcohol({
            volumeLiters: Number(volumeStr) || 0,
            juiceSugarGL: Number(fruitSugarStr) || 0,
            addedSugarGrams: Number(addedSugarStr) || 0,
            yeastId,
            desiredAbvPercent: Number(desiredAbvStr) || 0,
        }),
    );
</script>

<FormWindow
    title="Predicted alcohol & chaptalization calculator"
    showBreadcrumbs={false}
    showCancel={false}
    acceptText="Close"
    onClose={onClose}
    onAccept={onClose}
>
    <div class="flex flex-col gap-4 text-zinc-800">
        <div class="grid gap-3 sm:grid-cols-2">
            <InputField
                label="Batch volume (L)"
                type="number"
                min={1}
                step={0.5}
                bind:value={volumeStr}
            />
            <InputField
                label="Juice / fruit sugar (g/L)"
                type="number"
                min={0}
                step={1}
                bind:value={fruitSugarStr}
            />
            <InputField
                label="Added sugar (g)"
                type="number"
                min={0}
                step={10}
                bind:value={addedSugarStr}
            />
            <InputField
                label="Desired target alcohol (% vol)"
                type="number"
                min={0}
                max={20}
                step={0.1}
                bind:value={desiredAbvStr}
            />
        </div>

        <div class="flex flex-col gap-1">
            <label class="text-sm text-zinc-600" for="yeast-strain-select">Yeast strain</label>
            <DropdownInput
                id="yeast-strain-select"
                class="w-full [&>button]:w-full [&>button]:h-12 [&>button]:rounded-full"
                options={YEAST_STRAINS.map((y) => ({ value: y.id, label: y.label }))}
                placeholder="Select yeast"
                bind:value={yeastId}
            />
        </div>

        <div class="grid gap-3 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4 sm:grid-cols-2">
            <div>
                <span class="block text-xs font-semibold uppercase text-zinc-500">
                    Predicted alcohol after fermentation
                </span>
                <div class="mt-1 flex items-center gap-2">
                    <span class="text-2xl font-bold text-[#3f2e22]">
                        {result.predictedAbv}% vol
                    </span>
                    {#if result.cappedByYeast}
                        <StatusBadge label="Capped by yeast tolerance" tone="danger" />
                    {/if}
                </div>
                <span class="mt-1 block text-xs text-zinc-600">
                    Total fermentable sugar: {result.totalSugarGL} g/L
                </span>
            </div>

            <div>
                <span class="block text-xs font-semibold uppercase text-zinc-500">
                    Sugar needed for {desiredAbvStr || 0}% vol
                </span>
                <span class="mt-1 block text-2xl font-bold text-[#6b4f3a]">
                    {result.requiredAddedSugarGrams} g
                </span>
                <span class="mt-1 block text-xs text-zinc-600">
                    Total sucrose to add to {volumeStr || 0} L of juice
                </span>
            </div>

            <p class="font-mono text-xs text-zinc-600 sm:col-span-2">
                Formula: {result.formula}
            </p>
        </div>
    </div>
</FormWindow>

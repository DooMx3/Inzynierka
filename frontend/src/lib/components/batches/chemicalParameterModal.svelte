<script lang="ts">
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import {
        validateChemicalParameterDraft,
        type ChemicalParameterDraft,
        type ChemicalParameterRecord,
    } from "$lib/api/parameters";

    let {
        batchLabel,
        editingRecord = null,
        onSave,
        onClose = () => {},
    }: {
        batchLabel: string;
        editingRecord?: ChemicalParameterRecord | null;
        onSave: (draft: ChemicalParameterDraft) => void | Promise<void>;
        onClose?: () => void;
    } = $props();

    let sugarStr = $derived<string | number | null>(
        editingRecord?.sugarLevel != null ? String(editingRecord.sugarLevel) : "",
    );
    let acidityStr = $derived<string | number | null>(
        editingRecord?.acidity != null ? String(editingRecord.acidity) : "",
    );
    let phStr = $derived<string | number | null>(
        editingRecord?.pH != null ? String(editingRecord.pH) : "",
    );
    let tempStr = $derived<string | number | null>(
        editingRecord?.temperature != null ? String(editingRecord.temperature) : "",
    );
    let alcoholStr = $derived<string | number | null>(
        editingRecord?.alcoholContent != null ? String(editingRecord.alcoholContent) : "",
    );
    let errorMsg = $state("");

    const parseOptional = (val: string | number | null): number | null => {
        const text = String(val ?? "").trim();
        if (!text) {
            return null;
        }
        const num = Number(text);
        return Number.isFinite(num) ? num : null;
    };

    const submit = async () => {
        const draft: ChemicalParameterDraft = {
            sugarLevel: parseOptional(sugarStr),
            acidity: parseOptional(acidityStr),
            pH: parseOptional(phStr),
            temperature: parseOptional(tempStr),
            alcoholContent: parseOptional(alcoholStr),
        };

        const validationError = validateChemicalParameterDraft(draft);
        if (validationError) {
            errorMsg = validationError;
            return;
        }

        errorMsg = "";
        try {
            await onSave(draft);
        } catch (error) {
            errorMsg = error instanceof Error ? error.message : "Could not save chemical parameters.";
        }
    };
</script>

<FormWindow
    title={editingRecord ? `Edit parameters · ${batchLabel}` : `Record parameters · ${batchLabel}`}
    showBreadcrumbs={false}
    acceptText="Confirm"
    onClose={onClose}
    onCancel={onClose}
    onAccept={() => void submit()}
>
    <div class="flex flex-col gap-4">
        <div class="grid gap-3 sm:grid-cols-2">
            <InputField
                label="Sugar level (g/L)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g. 210"
                bind:value={sugarStr}
            />
            <InputField
                label="Acidity level (g/L)"
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g. 6.5"
                bind:value={acidityStr}
            />
            <InputField
                label="pH"
                type="number"
                min={2.5}
                max={4.5}
                step={0.01}
                placeholder="e.g. 3.35"
                bind:value={phStr}
            />
            <InputField
                label="Temperature (°C)"
                type="number"
                step={0.1}
                placeholder="e.g. 18.0"
                bind:value={tempStr}
            />
            <InputField
                label="Alcohol content (% vol)"
                type="number"
                min={0}
                max={22}
                step={0.1}
                placeholder="e.g. 12.4"
                bind:value={alcoholStr}
            />
        </div>

        {#if errorMsg}
            <p class="text-sm text-[#8f3d32]" role="alert">{errorMsg}</p>
        {/if}
    </div>
</FormWindow>

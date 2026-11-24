<script lang="ts">
    import Button from "$lib/components/buttons/button.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import NutrientsTable from "./nutrientsTable.svelte";
    import type { NutrientProfile } from "$lib/functions/calculators";

    let {
        batchName,
        initialNutrients,
        autoCalculatedNutrients,
        editable = true,
        onSave,
        onClose = () => {},
    }: {
        batchName: string;
        initialNutrients: NutrientProfile;
        autoCalculatedNutrients: NutrientProfile;
        editable?: boolean;
        onSave?: (updated: NutrientProfile) => void;
        onClose?: () => void;
    } = $props();

    let draft = $derived<NutrientProfile>({ ...initialNutrients });

    const recalculate = () => {
        draft = { ...autoCalculatedNutrients };
    };

    const handleAccept = () => {
        if (editable && onSave) {
            onSave({ ...draft });
        }
        onClose();
    };
</script>

<FormWindow
    title={`Nutrients table · ${batchName}`}
    showBreadcrumbs={false}
    acceptText={editable ? "Save nutrients" : "Close"}
    showCancel={editable}
    onClose={onClose}
    onCancel={onClose}
    onAccept={handleAccept}
>
    <div class="flex flex-col gap-4">
        {#if editable}
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-3">
                <p class="text-sm text-zinc-700">
                    Values are automatically estimated from alcohol, residual sugar, and added ingredients. Any row can be adjusted manually.
                </p>
                <div class="w-fit min-w-56 max-w-full">
                    <Button
                        text="Recalculate automatically"
                        isFolded={false}
                        gentle={true}
                        class="bg-[#8c735c] text-white px-4"
                        onClick={recalculate}
                    />
                </div>
            </div>
        {/if}

        <NutrientsTable bind:nutrients={draft} {editable} />
    </div>
</FormWindow>

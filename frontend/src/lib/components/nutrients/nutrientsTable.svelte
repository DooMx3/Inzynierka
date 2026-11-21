<script lang="ts">
    import { kcalToKj, type NutrientProfile } from "$lib/functions/calculators";

    let {
        nutrients = $bindable<NutrientProfile>({
            energyKcal: 0,
            fat: 0,
            saturatedFattyAcids: 0,
            carbs: 0,
            sugars: 0,
            protein: 0,
            salt: 0,
            fibers: 0,
        }),
        editable = false,
    }: {
        nutrients?: NutrientProfile;
        editable?: boolean;
    } = $props();

    const updateField = (key: keyof NutrientProfile, raw: string) => {
        const parsed = Number(raw);
        nutrients = {
            ...nutrients,
            [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
        };
    };

    const rows: {
        key: keyof NutrientProfile;
        label: string;
        unit: string;
        indented?: boolean;
        step?: number;
    }[] = [
        { key: "energyKcal", label: "Energy value", unit: "kcal", step: 0.1 },
        { key: "fat", label: "Fat", unit: "g", step: 0.1 },
        {
            key: "saturatedFattyAcids",
            label: "of which: saturated fatty acids",
            unit: "g",
            indented: true,
            step: 0.1,
        },
        { key: "carbs", label: "Carbohydrates", unit: "g", step: 0.1 },
        { key: "sugars", label: "of which: sugars", unit: "g", indented: true, step: 0.1 },
        { key: "protein", label: "Protein", unit: "g", step: 0.1 },
        { key: "salt", label: "Salt", unit: "g", step: 0.01 },
        { key: "fibers", label: "Fibre", unit: "g", step: 0.1 },
    ];
</script>

<div class="overflow-hidden rounded-xl border border-[#d9cbbd] bg-white shadow-sm">
    <table class="w-full border-collapse text-left text-sm" aria-label="Table of nutrients">
        <thead class="bg-[#e4d8cb] text-[#3f2e22]">
            <tr>
                <th class="px-4 py-2.5 font-bold">Nutrient</th>
                <th class="px-4 py-2.5 text-right font-bold">Per 100 ml</th>
            </tr>
        </thead>
        <tbody>
            {#each rows as row, index (row.key)}
                <tr
                    class={[
                        "border-t border-[#e4d8cb]",
                        index % 2 === 1 ? "bg-[#fbf7f2]" : "bg-white",
                    ]}
                >
                    <td class={["px-4 py-2.5 text-[#3f2e22]", row.indented ? "pl-8 italic text-zinc-600" : "font-medium"]}>
                        {row.label}
                    </td>
                    <td class="px-4 py-2 text-right">
                        {#if editable}
                            <div class="inline-flex items-center justify-end gap-2">
                                {#if row.key === "energyKcal"}
                                    <span class="text-xs text-zinc-500">
                                        {kcalToKj(nutrients.energyKcal)} kJ /
                                    </span>
                                {/if}
                                <input
                                    type="number"
                                    min="0"
                                    step={row.step ?? 0.1}
                                    aria-label={row.label}
                                    value={nutrients[row.key]}
                                    oninput={(event) =>
                                        updateField(
                                            row.key,
                                            (event.currentTarget as HTMLInputElement).value,
                                        )}
                                    class="h-8 w-24 rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-2 text-right text-sm font-medium text-[#3f2e22] focus:border-[#6b4f3a] focus:outline-none"
                                />
                                <span class="w-8 text-left text-xs text-zinc-600">{row.unit}</span>
                            </div>
                        {:else if row.key === "energyKcal"}
                            <span class="font-semibold text-[#3f2e22]">
                                {kcalToKj(nutrients.energyKcal)} kJ / {nutrients.energyKcal} kcal
                            </span>
                        {:else}
                            <span class="font-semibold text-[#3f2e22]">
                                {nutrients[row.key]} {row.unit}
                            </span>
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

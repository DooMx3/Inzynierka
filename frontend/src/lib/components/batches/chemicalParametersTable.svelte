<script lang="ts">
    import type { ChemicalParameterRecord } from "$lib/api/parameters";

    let {
        records,
        onEdit = () => {},
        onDelete = () => {},
    }: {
        records: ChemicalParameterRecord[];
        onEdit?: (record: ChemicalParameterRecord) => void;
        onDelete?: (record: ChemicalParameterRecord) => void;
    } = $props();

    const formatTimestamp = (iso: string) => {
        if (!iso) {
            return "—";
        }
        return iso.replace("T", " ").slice(0, 16);
    };

    const formatVal = (val: number | null, unit = "") =>
        val === null || val === undefined ? "—" : `${val}${unit ? ` ${unit}` : ""}`;
</script>

{#if records.length === 0}
    <p class="text-xs italic text-zinc-500">
        No chemical parameter readings recorded for this batch yet.
    </p>
{:else}
    <div class="overflow-x-auto rounded-lg border border-[#d9cbbd] bg-white">
        <table class="w-full border-collapse text-left text-xs">
            <thead class="bg-[#e4d8cb] text-[#3f2e22]">
                <tr>
                    <th class="px-3 py-2 font-bold">Recorded at</th>
                    <th class="px-3 py-2 font-bold">Sugar level</th>
                    <th class="px-3 py-2 font-bold">Acidity</th>
                    <th class="px-3 py-2 font-bold">pH</th>
                    <th class="px-3 py-2 font-bold">Temperature</th>
                    <th class="px-3 py-2 font-bold">Alcohol content</th>
                    <th class="px-3 py-2 text-right font-bold">Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each records as rec (rec.id)}
                    <tr class="border-t border-[#e4d8cb] hover:bg-[#fbf7f2]">
                        <td class="px-3 py-2 text-zinc-600">{formatTimestamp(rec.recordedAt)}</td>
                        <td class="px-3 py-2 font-medium text-[#3f2e22]">
                            {formatVal(rec.sugarLevel, "g/L")}
                        </td>
                        <td class="px-3 py-2">{formatVal(rec.acidity, "g/L")}</td>
                        <td class="px-3 py-2">{formatVal(rec.pH)}</td>
                        <td class="px-3 py-2">{formatVal(rec.temperature, "°C")}</td>
                        <td class="px-3 py-2">{formatVal(rec.alcoholContent, "%")}</td>
                        <td class="px-3 py-2 text-right">
                            <div class="inline-flex items-center gap-2">
                                <button
                                    type="button"
                                    class="cursor-pointer rounded-md bg-[#6b4f3a] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#3f2e22]"
                                    onclick={() => onEdit(rec)}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    class="cursor-pointer rounded-md bg-[#8f3d32] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                                    onclick={() => onDelete(rec)}
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

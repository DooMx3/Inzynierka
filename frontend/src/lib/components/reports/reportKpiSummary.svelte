<script lang="ts">
    import type { ComputedReportContent } from "$lib/functions/reportCalculators";

    let {
        content,
    }: {
        content: ComputedReportContent;
    } = $props();
</script>

<div class="flex flex-col gap-4 text-sm text-zinc-700">
    <p class="leading-relaxed text-[#3f2e22]">
        {content.summary}
    </p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each content.kpis as kpi (kpi.label)}
            <div class="rounded-xl border border-[#d9cbbd] bg-[#f7f1ea] p-3.5 shadow-xs">
                <span class="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {kpi.label}
                </span>
                <span class="mt-1 block text-lg font-bold text-[#3f2e22]">
                    {kpi.value}
                </span>
                {#if kpi.sublabel}
                    <span class="mt-0.5 block text-xs text-zinc-600">
                        {kpi.sublabel}
                    </span>
                {/if}
            </div>
        {/each}
    </div>

    <div class="overflow-x-auto rounded-xl border border-[#d9cbbd] bg-white">
        <table class="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead class="bg-[#e4d8cb] text-[#3f2e22]">
                <tr>
                    {#each content.columns as column, colIdx (`${colIdx}-${column}`)}
                        <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                            {column}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#if content.rows.length === 0}
                    <tr>
                        <td colspan="4" class="px-4 py-5 text-center text-zinc-500">
                            No breakdown records in the selected period.
                        </td>
                    </tr>
                {:else}
                    {#each content.rows as row, rowIdx (row.id)}
                        <tr
                            class={[
                                "border-t border-[#e4d8cb]",
                                rowIdx % 2 === 1 ? "bg-[#fbf7f2]" : "bg-white",
                            ]}
                        >
                            <td class="px-4 py-2.5 font-medium text-[#3f2e22]">{row.col1}</td>
                            <td class="px-4 py-2.5 text-zinc-700">{row.col2}</td>
                            <td class="px-4 py-2.5 text-zinc-700">{row.col3}</td>
                            <td class="px-4 py-2.5 text-zinc-700">{row.col4}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<script lang="ts">
    import ResultsTable from "./resultsTable.svelte";

    type Item = { id: string; name: string };

    let { rows, pageSize = 8 }: { rows: Item[]; pageSize?: number } = $props();
</script>

<ResultsTable {rows} {pageSize}>
    {#snippet head()}
        <th class="px-4 py-3">Name</th>
    {/snippet}
    {#snippet row(item)}
        <tr>
            <td class="px-4 py-3">{item.name}</td>
        </tr>
    {/snippet}
</ResultsTable>

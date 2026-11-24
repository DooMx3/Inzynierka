<script lang="ts">
    import ResultsTable from "../resultsTable/resultsTable.svelte";
    import TableRow from "./tableRow.svelte";

    type Item = {
        id: string;
        name: string;
        extra?: string;
    };

    let {
        rows,
        selectable = true,
        expandOnRowClick = false,
        highlightedId,
        autoScrollWhenHighlighted = false,
    }: {
        rows: Item[];
        selectable?: boolean;
        expandOnRowClick?: boolean;
        highlightedId?: string;
        autoScrollWhenHighlighted?: boolean;
    } = $props();

    let selectedIds = $state<string[]>([]);

    const toggleSelect = (id: string) => {
        selectedIds = selectedIds.includes(id)
            ? selectedIds.filter((item) => item !== id)
            : [...selectedIds, id];
    };
</script>

<ResultsTable {rows} {highlightedId}>
    {#snippet head()}
        {#if selectable}
            <th class="px-4 py-3">Select</th>
        {/if}
        <th class="px-4 py-3">Name</th>
        <th class="px-4 py-3">Actions</th>
    {/snippet}
    {#snippet row(item, index)}
        {@const isHighlighted = highlightedId === item.id}
        {#if item.extra}
            <TableRow
                {index}
                rowId={`row-${item.id}`}
                {selectable}
                selected={selectedIds.includes(item.id)}
                selectLabel={`Select ${item.name}`}
                onToggleSelect={() => toggleSelect(item.id)}
                expandLabel={`Expand ${item.name}`}
                {expandOnRowClick}
                highlighted={isHighlighted}
                {autoScrollWhenHighlighted}
            >
                {#snippet cells()}
                    <td class="px-4 py-3">{item.name}</td>
                {/snippet}
                {#snippet actions()}
                    <button type="button">Edit {item.name}</button>
                {/snippet}
                {#snippet details()}
                    <div>Details for {item.name}: {item.extra}</div>
                {/snippet}
            </TableRow>
        {:else}
            <TableRow
                {index}
                rowId={`row-${item.id}`}
                {selectable}
                selected={selectedIds.includes(item.id)}
                selectLabel={`Select ${item.name}`}
                onToggleSelect={() => toggleSelect(item.id)}
                {expandOnRowClick}
                highlighted={isHighlighted}
                {autoScrollWhenHighlighted}
            >
                {#snippet cells()}
                    <td class="px-4 py-3">{item.name}</td>
                {/snippet}
            </TableRow>
        {/if}
    {/snippet}
</ResultsTable>

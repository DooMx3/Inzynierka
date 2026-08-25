<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import sortIcon from "$lib/assets/sort.svg?raw";
</script>

<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1">Sort by</span>
    <DropdownInput options={["apple", "banana", "pear"]} additionalIcon={sortIcon}/>
</span>

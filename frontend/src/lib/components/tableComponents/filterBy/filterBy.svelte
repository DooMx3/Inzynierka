<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import filterIcon from "$lib/assets/filter.svg?raw";
</script>

<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1">Filters</span>
    <DropdownInput options={["apple >", "banana >", "pear >"]} additionalIcon={filterIcon}/>
</span>

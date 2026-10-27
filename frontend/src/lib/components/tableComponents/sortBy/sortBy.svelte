<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import sortIcon from "$lib/assets/sort.svg?raw";

    let {
        options = ["apple", "banana", "pear"],
        value = $bindable(""),
        placeholder = "Number",
    }: {
        options?: ({ value: string; label: string } | string)[];
        value?: string;
        placeholder?: string;
    } = $props();
</script>

<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1">Sort by</span>
    <DropdownInput {options} {placeholder} bind:value additionalIcon={sortIcon} />
</span>

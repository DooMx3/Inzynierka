<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import filterIcon from "$lib/assets/filter.svg?raw";

    let {
        options = ["apple >", "banana >", "pear >"],
        value = $bindable(""),
        placeholder = "Number",
    }: {
        options?: ({ value: string; label: string } | string)[];
        value?: string;
        placeholder?: string;
    } = $props();
</script>

<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1">Filters</span>
    <DropdownInput {options} {placeholder} bind:value additionalIcon={filterIcon} />
</span>

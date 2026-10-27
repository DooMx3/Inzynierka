<script lang="ts">
    import SearchBar from "../searchBar/searchBar.svelte";
    import SortBy from "../sortBy/sortBy.svelte";
    import FilterBy from "../filterBy/filterBy.svelte";
    import SearchButton from "../searchButton/searchButton.svelte";

    type Option = { value: string; label: string } | string;

    let {
        query = $bindable(""),
        sort = $bindable(""),
        filter = $bindable(""),
        sortOptions = [
            { value: "name", label: "Name" },
            { value: "email", label: "E-mail" },
            { value: "role", label: "Role" },
        ],
        filterOptions = [
            { value: "all", label: "All" },
            { value: "WORKER", label: "Vineyard Worker" },
            { value: "OENOLOGIST", label: "Oenologist" },
            { value: "OWNER", label: "Owner" },
            { value: "unassigned", label: "Unassigned" },
            { value: "pending", label: "Pending invitation" },
        ],
        searchLabel = "Who are you looking for?",
        searchPlaceholder = "Search for first name, e-mail, role, etc.",
        onSearch = () => {},
    }: {
        query?: string;
        sort?: string;
        filter?: string;
        sortOptions?: Option[];
        filterOptions?: Option[];
        searchLabel?: string;
        searchPlaceholder?: string;
        onSearch?: () => void;
    } = $props();
</script>

<div
    class="flex flex-wrap items-end gap-4 rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-4 shadow-sm"
    role="search"
    aria-label="Results toolbar"
>
    <div class="min-w-64 flex-1">
        <SearchBar
            label={searchLabel}
            placeholder={searchPlaceholder}
            bind:value={query}
            onEnter={onSearch}
        />
    </div>
    <SortBy options={sortOptions} placeholder="Sort" bind:value={sort} />
    <FilterBy options={filterOptions} placeholder="Filter" bind:value={filter} />
    <div class="ml-auto w-40">
        <SearchButton onClick={onSearch} />
    </div>
</div>

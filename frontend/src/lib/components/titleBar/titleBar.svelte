<script lang="ts">
    import logo from "$lib/assets/logo.webp";
    import ProfileDropdownButton from "../buttons/profileDropdownButton.svelte";
    import SearchField from "../searchField/searchField.svelte";

    let search = $state("");
</script>

<span class="flex items-center justify-center h-24 w-full bg-zinc-800">
    <span class="flex items-center justify-start w-1/3">
        <img alt="Logo" src={logo} class="h-24 w-24 mr-2" />
        <p class="text-white font-semibold text-2xl">Name goes here</p>
    </span>
    <span class="flex items-center justify-center w-1/3">
        <SearchField
            bind:value={search}
            placeholder="Search"
            class="max-w-md ml-4"
        />
    </span>
    <span class="flex items-center justify-end w-1/3">
        <ProfileDropdownButton
            onClick={() => console.log("Profile Dropdown")}
            class="ml-auto"
            accountName="Henryk"
        />
    </span>
</span>

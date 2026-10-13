<script lang="ts">
    import UserMenu from "./userMenu.svelte";
    import addIcon from "$lib/assets/add.svg?raw";

    let {
        onClick: onClickFunction = () => {},
        disabled = false,
    } = $props();
</script>

<UserMenu
    onClick={onClickFunction}
    svg={addIcon}
    text="Create <span class='text-green-700'>new</span> vineyard"
    class="border-2 border-dashed border-[#c4b6a6] w-72 h-56"
    {disabled}
/>

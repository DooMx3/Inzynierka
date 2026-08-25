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
    text="Create <span class='text-green-400'>new</span> vineyard"
    class="border-2 border-dashed border-zinc-400 bg-zinc-800/60 w-1/3 h-1/2"
    {disabled}
/>

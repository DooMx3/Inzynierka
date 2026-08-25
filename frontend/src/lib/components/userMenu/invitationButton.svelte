<script lang="ts">
    import UserMenu from "./userMenu.svelte";
    import vineryIcon from "$lib/assets/vinery.svg?raw";

    let {
        onClick: onClickFunction = () => {},
        disabled = false,
    } = $props();
</script>

<UserMenu
    onClick={onClickFunction}
    svg={vineryIcon}
    text="You have been <span class='font-bold'>invited!</span> Click to review details"
    class="border-2 border-dashed border-zinc-400 bg-zinc-800/60 w-1/3 h-1/2"
    {disabled}
/>

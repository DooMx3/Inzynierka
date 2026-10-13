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
    class="border-2 border-dashed border-[#c4b6a6] w-72 h-56"
    {disabled}
/>

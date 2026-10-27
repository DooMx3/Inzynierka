<script lang="ts">
    import Button from "./button.svelte";
    import cancelIcon from "$lib/assets/cancel.svg?raw";
    let {
        text = "Cancel",
        gentle = true,
        onClick: onClickFunction = () => {},
    } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={cancelIcon}
    text={text}
    {gentle}
    class="bg-[#8f3d32] text-white fill-white"
    isFolded={false}
/>

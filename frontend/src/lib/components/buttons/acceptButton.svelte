<script lang="ts">
    import Button from "./button.svelte";
    import checkIcon from "$lib/assets/check.svg?raw";
    let {
        text = "Confirm",
        svg = checkIcon,
        gentle = true,
        onClick: onClickFunction = () => {},
    } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    {svg}
    text={text}
    {gentle}
    class="bg-[#6b4f3a] text-white fill-white"
    isFolded={false}
/>

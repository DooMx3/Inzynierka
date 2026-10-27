<script lang="ts">
    import Button from "./button.svelte";

    let {
        onClick: onClickFunction = () => {},
        svg = "",
        text = "Agrokultura",
        isFolded = false,
    } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    {svg}
    {text}
    isMenuButton={true}
    class="bg-[#6b4f3a] text-white font-semibold fill-white justify-start"
    {isFolded}
/>

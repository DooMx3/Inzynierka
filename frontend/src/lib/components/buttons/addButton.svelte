<script lang="ts">
    import Button from "./button.svelte";
    import plusIcon from "$lib/assets/plus.svg?raw";

    let {
        text = "Add new",
        onClick = () => {},
    }: {
        text?: string;
        onClick?: () => void;
    } = $props();
</script>

<Button
    onClick={() => onClick()}
    svg={plusIcon}
    {text}
    class="bg-[#6b4f3a] text-white fill-white"
    isFolded={false}
/>

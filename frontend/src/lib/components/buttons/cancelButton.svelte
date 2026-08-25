<script lang="ts">
    import Button from "./button.svelte";
    import cancelIcon from "$lib/assets/cancel.svg?raw";
    let { text = "Cancel", onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={cancelIcon}
    text={text}
    class="bg-red-500 text-white fill-white"
    isFolded={false}
/>

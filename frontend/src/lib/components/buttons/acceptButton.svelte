<script lang="ts">
    import Button from "./button.svelte";
    import checkIcon from "$lib/assets/check.svg?raw";
    let { text = "Confirm", onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={checkIcon}
    text={text}
    class="bg-green-500 text-white fill-white"
    isFolded={false}
/>

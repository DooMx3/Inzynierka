<script lang="ts">
    import Button from "./button.svelte";
    import newBatchIcon from "$lib/assets/new_batch.svg?raw";
    let { text = "Create new batch", onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={newBatchIcon}
    text={text}
    class="bg-gray-500 text-white fill-white"
    isFolded={false}
/>

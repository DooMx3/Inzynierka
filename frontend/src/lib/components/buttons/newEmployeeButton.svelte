<script lang="ts">
    import Button from "./button.svelte";
    import personIcon from "$lib/assets/person.svg?raw";

    let { text = "New employee", onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={personIcon}
    {text}
    class="bg-[#6b4f3a] text-white fill-white"
    isFolded={false}
/>

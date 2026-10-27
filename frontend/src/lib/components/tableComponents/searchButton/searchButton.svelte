<script lang="ts">
    import searchIcon from "$lib/assets/search.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";

    let { text = "Search", onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={() => onClickFunction()}
    svg={searchIcon}
    text={text}
    class="bg-[#6b4f3a] text-white fill-white"
    isFolded={false}
/>

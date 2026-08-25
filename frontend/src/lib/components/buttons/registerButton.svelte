<script lang="ts">
    import Button from "./button.svelte";
    import registerIcon from "../../assets/register.svg?raw";

    let { onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={onClickFunction}
    svg={registerIcon}
    text={"Register"}
    class="bg-green-300 text-white fill-white"
/>

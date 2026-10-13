<script lang="ts">
    import Button from "./button.svelte";
    import registerIcon from "../../assets/register.svg?raw";

    let { onClick: onClickFunction = () => {}, type = "button" } = $props();
</script>

<Button
    onClick={onClickFunction}
    {type}
    svg={registerIcon}
    text={"Register"}
    isFolded={false}
    gentle={true}
    class="w-full bg-[#3f6b4a] text-white fill-white"
/>

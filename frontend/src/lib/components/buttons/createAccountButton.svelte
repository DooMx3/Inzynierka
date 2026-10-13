<script lang="ts">
    import Button from "./button.svelte";
    import createAccountIcon from "../../assets/createAccount.svg?raw";

    let { onClick: onClickFunction = () => {}, type = "button" } = $props();
</script>

<Button
    onClick={onClickFunction}
    {type}
    svg={createAccountIcon}
    text={"Create free account"}
    isFolded={false}
    gentle={true}
    class="w-full bg-[#3f6b4a] text-white fill-white"
/>

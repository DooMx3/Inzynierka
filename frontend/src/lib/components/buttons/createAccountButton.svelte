<script lang="ts">
    import Button from "./button.svelte";
    import createAccountIcon from "../../assets/createAccount.svg?raw";

    let { onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={onClickFunction}
    svg={createAccountIcon}
    text={"Create free account"}
    class="bg-green-300 text-white fill-white"
/>

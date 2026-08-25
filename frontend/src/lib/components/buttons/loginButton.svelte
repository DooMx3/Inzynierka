<script lang="ts">
    import Button from "./button.svelte";
    import loginIcon from "../../assets/login.svg?raw";

    let { onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={onClickFunction}
    svg={loginIcon}
    text={"Login"}
    class="bg-gray-300 text-white fill-white"
/>

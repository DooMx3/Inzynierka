<script lang="ts">
    import Button from "./button.svelte";
    import loginIcon from "../../assets/login.svg?raw";

    let { onClick: onClickFunction = () => {}, type = "button" } = $props();
</script>

<Button
    onClick={onClickFunction}
    {type}
    svg={loginIcon}
    text={"Login"}
    isFolded={false}
    gentle={true}
    class="w-full bg-[#6b4f3a] text-white fill-white"
/>

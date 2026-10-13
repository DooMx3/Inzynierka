<script lang="ts">
    import Button from "./button.svelte";
    import passwordIcon from "../../assets/password.svg?raw";

    let { onClick: onClickFunction = () => {}, type = "button" } = $props();
</script>

<Button
    onClick={onClickFunction}
    {type}
    svg={passwordIcon}
    text="Reset password"
    isFolded={false}
    gentle={true}
    class="w-full bg-[#3f6b4a] text-white fill-white"
/>

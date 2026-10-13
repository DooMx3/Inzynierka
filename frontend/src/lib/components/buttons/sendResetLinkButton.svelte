<script lang="ts">
    import Button from "./button.svelte";
    import mailIcon from "../../assets/mail.svg?raw";

    let { onClick: onClickFunction = () => {}, type = "button" } = $props();
</script>

<Button
    onClick={onClickFunction}
    {type}
    svg={mailIcon}
    text="Send reset link"
    isFolded={false}
    gentle={true}
    class="w-full bg-[#6b4f3a] text-white fill-white"
/>

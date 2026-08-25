<script lang="ts">
    import Button from "./button.svelte";
    import plannedTasksIcon from "../../assets/task.svg?raw";

    let { onClick: onClickFunction = () => {} } = $props();
</script>

<Button
    onClick={onClickFunction}
    svg={plannedTasksIcon}
    class="bg-blue-300 text-white fill-white"
/>

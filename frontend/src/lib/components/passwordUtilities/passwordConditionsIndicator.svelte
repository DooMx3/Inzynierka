<script lang="ts">
    import { checkPasswordConditions } from "$lib/functions/passwordConditionsChecker";
    import check from "$lib/assets/check.svg?raw";
    import close from "$lib/assets/close.svg?raw";

    let { password, class: className } = $props();

    let conditions = $derived(checkPasswordConditions(password));

    $effect(() => {
        conditions = checkPasswordConditions(password);
    });
</script>

<span class={className}>
    <span class="text-sm text-gray-500">Password must contain:</span>
    <span class="text-sm text-gray-500">
        <ul>
            <li class="flex items-center gap-1">
                {#if conditions[0].isValid}
                    <span class="fill-green-500">{@html check}</span>
                {:else}
                    <span class="fill-red-500">{@html close}</span>
                {/if}
                <span class="">At least 8 characters</span>
            </li>
            <li class="flex items-center gap-1">
                {#if conditions[1].isValid}
                    <span class="fill-green-500">{@html check}</span>
                {:else}
                    <span class="fill-red-500">{@html close}</span>
                {/if}
                <span class="">At least one uppercase letter</span>
            </li>
            <li class="flex items-center gap-1">
                {#if conditions[2].isValid}
                    <span class="fill-green-500">{@html check}</span>
                {:else}
                    <span class="fill-red-500">{@html close}</span>
                {/if}
                <span class="">At least one lowercase letter</span>
            </li>
            <li class="flex items-center gap-1">
                {#if conditions[3].isValid}
                    <span class="fill-green-500">{@html check}</span>
                {:else}
                    <span class="fill-red-500">{@html close}</span>
                {/if}
                <span class="">At least one number</span>
            </li>
            <li class="flex items-center gap-1">
                {#if conditions[4].isValid}
                    <span class="fill-green-500">{@html check}</span>
                {:else}
                    <span class="fill-red-500">{@html close}</span>
                {/if}
                <span class="">At least one special character</span>
            </li>
        </ul>
    </span>
</span>

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-5 w-5;
        fill: inherit;
        stroke: inherit;
    }
</style>

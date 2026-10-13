<script lang="ts">
    import { isPasswordReadyForRegistration, checkPasswordConditions } from "$lib/functions/passwordConditionsChecker";
    import check from "$lib/assets/check.svg?raw";
    import close from "$lib/assets/close.svg?raw";

    let {
        password,
        valid = $bindable(false),
        class: className = "",
    }: {
        password: string;
        valid?: boolean;
        class?: string;
    } = $props();

    let conditions = $derived(checkPasswordConditions(password));
    let allValid = $derived(isPasswordReadyForRegistration(password));

    $effect.pre(() => {
        valid = allValid;
    });
</script>

<span class={className}>
    <span class="text-sm text-gray-500">Password must contain:</span>
    <span class="text-sm text-gray-500">
        <ul>
            {#each conditions as condition (condition.description)}
                <li class="flex items-center gap-1">
                    {#if condition.isValid}
                        <span class="fill-green-500">{@html check}</span>
                    {:else}
                        <span class="fill-red-500">{@html close}</span>
                    {/if}
                    <span>{condition.description}</span>
                </li>
            {/each}
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

<script lang="ts">
    import { checkPasswordStrength } from "$lib/functions/passwordStrengthChecker";

    let { password, userInput, class: className } = $props();

    let score = $state(-1);

    $effect(() => {
        const strength = checkPasswordStrength(password, userInput);
        score = strength.score;
    });
</script>

<span class={["flex gap-1", className]}>
    {#if score >= 0}
        <span class="w-8 h-3 rounded-lg bg-red-400"></span>
    {/if}
    {#if score >= 1}
        <span class="w-8 h-3 rounded-lg bg-orange-400"></span>
    {/if}
    {#if score >= 2}
        <span class="w-8 h-3 rounded-lg bg-yellow-400"></span>
    {/if}
    {#if score >= 3}
        <span class="w-8 h-3 rounded-lg bg-green-400"></span>
    {/if}
    {#if score >= 4}
        <span class="w-8 h-3 rounded-lg bg-blue-400"></span>
    {/if}
</span>

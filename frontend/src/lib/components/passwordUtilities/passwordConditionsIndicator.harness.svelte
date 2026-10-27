<script lang="ts">
    import PasswordConditionsIndicator from "./passwordConditionsIndicator.svelte";

    let { password }: { password: string } = $props();
    let valid = $state(false);

    export const isPasswordValid = () => valid;
</script>

<PasswordConditionsIndicator {password} bind:valid />

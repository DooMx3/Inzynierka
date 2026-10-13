<script lang="ts">
    import { page } from "$app/state";
    import ResetPasswordForm from "$lib/components/resetPasswordForm/resetPasswordForm.svelte";

    let token = $derived(page.url.searchParams.get("token") ?? "");
</script>

<div class="flex h-full min-h-full items-center justify-center overflow-y-auto p-8">
    <div class="w-full max-w-md">
        <ResetPasswordForm {token} />
    </div>
</div>

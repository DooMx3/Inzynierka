<script lang="ts">
    import ForgotPasswordForm from "$lib/components/forgotPasswordForm/forgotPasswordForm.svelte";

    const backToSignIn = () => {
        window.location.href = "/auth";
    };
</script>

<div class="flex h-full min-h-full items-center justify-center overflow-y-auto p-8">
    <div class="w-full max-w-md">
        <ForgotPasswordForm onBackToSignIn={backToSignIn} />
    </div>
</div>

<script lang="ts">
    import ProfileForm from "$lib/components/profile/profileForm.svelte";
    import ProfileVineyardSection from "$lib/components/profile/profileVineyardSection.svelte";
</script>

<div class="flex h-full min-h-full items-start justify-center overflow-y-auto px-4 py-6">
    <div class="flex w-full max-w-xl flex-col gap-6">
        <ProfileForm />
        <ProfileVineyardSection />
    </div>
</div>

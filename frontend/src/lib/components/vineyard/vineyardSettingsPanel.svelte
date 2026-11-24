<script lang="ts">
    import { onMount } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { gooeyToast } from "goey-toast-svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import OrganisationFields from "$lib/components/userHome/organisationFields.svelte";
    import {
        deleteOrganisation,
        deleteOrganisationLogo,
        getOrganisation,
        getOrganisationLogoByIdUrl,
        updateOrganisation,
        uploadOrganisationLogo,
        type Organisation,
    } from "$lib/api/organisation";
    import { refreshSession, session, setUser } from "$lib/stores/session.svelte";

    let organisation = $state<Organisation | null>(null);
    let loading = $state(true);
    let loadError = $state("");

    let dialog = $state<"edit" | "delete" | null>(null);
    let showErrors = $state(false);
    let pending = $state(false);
    let deletePassword = $state("");

    let name = $state("");
    let city = $state("");
    let street = $state("");
    let postalCode = $state("");
    let taxId = $state("");
    let motto = $state("");
    let logoFile = $state<File | null>(null);
    let logoPreviewUrl = $state<string | null>(null);
    let logoTimestamp = $state(Date.now());

    const sideBySide = new MediaQuery("(min-width: 840px) and (max-width: 1499px)");
    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);
    const nameInvalid = $derived(showErrors && name.trim().length === 0);
    const cityInvalid = $derived(showErrors && city.trim().length === 0);
    const deletePasswordMissing = $derived(showErrors && deletePassword.length === 0);

    const display = (value: string | null | undefined): string => {
        const trimmed = value?.trim() ?? "";
        return trimmed.length > 0 ? trimmed : "Not set";
    };

    const fillForm = (source: Organisation | null) => {
        name = source?.name ?? "";
        city = source?.city ?? "";
        street = source?.street ?? "";
        postalCode = source?.postalCode ?? "";
        taxId = source?.taxId ?? "";
        motto = source?.motto ?? "";
        logoFile = null;
        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
            logoPreviewUrl = null;
        }
    };

    const loadVineyard = async () => {
        loading = true;
        loadError = "";
        try {
            organisation = await getOrganisation();
        } catch (error) {
            organisation = null;
            loadError =
                error instanceof Error ? error.message : "Could not load vineyard details.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!session.user?.roles.includes("OWNER")) {
            loading = false;
            return;
        }
        void loadVineyard();
    });

    const openEdit = () => {
        fillForm(organisation);
        showErrors = false;
        dialog = "edit";
    };

    const openDelete = () => {
        deletePassword = "";
        showErrors = false;
        dialog = "delete";
    };

    const onLogoFileChange = (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
            logoPreviewUrl = null;
        }
        logoFile = file;
        if (file) {
            logoPreviewUrl = URL.createObjectURL(file);
        }
    };

    const draft = () => ({
        name: name.trim(),
        city: city.trim(),
        street: street.trim(),
        postalCode: postalCode.trim(),
        taxId: taxId.trim(),
        motto: motto.trim(),
    });

    const organisationMessages = () => {
        const messages: string[] = [];
        if (name.trim().length === 0) {
            messages.push("Enter the organisation name.");
        }
        if (city.trim().length === 0) {
            messages.push("Enter the city.");
        }
        return messages;
    };

    const saveOrganisation = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        gooeyToast.dismiss({ type: ["error", "warning"] });
        const messages = organisationMessages();
        if (messages.length > 0) {
            gooeyToast.warning("Check vineyard details", {
                description: messages.join(" "),
            });
            return;
        }

        pending = true;
        try {
            organisation = await updateOrganisation(draft());
            if (logoFile) {
                try {
                    await uploadOrganisationLogo(logoFile);
                    logoTimestamp = Date.now();
                    organisation = await getOrganisation();
                } catch {
                    gooeyToast.warning("Logo upload failed", {
                        description: "Details were saved, but the new logo could not be uploaded.",
                    });
                }
            }
            dialog = null;
            gooeyToast.success("Vineyard updated", {
                description: "Organisation details have been saved.",
            });
        } catch (error) {
            gooeyToast.error("Could not update the organisation", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            pending = false;
        }
    };

    const handleRemoveLogo = async () => {
        if (pending || !organisation?.logoPath) {
            return;
        }
        pending = true;
        try {
            await deleteOrganisationLogo();
            logoTimestamp = Date.now();
            organisation = { ...organisation, logoPath: null };
            gooeyToast.info("Logo removed", {
                description: "The vineyard logo has been removed.",
            });
        } catch (error) {
            gooeyToast.error("Could not remove logo", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            pending = false;
        }
    };

    const submitDelete = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        gooeyToast.dismiss({ type: ["error", "warning"] });
        if (deletePassword.length === 0) {
            gooeyToast.warning("Password required", {
                description: "Enter your password.",
            });
            return;
        }

        pending = true;
        try {
            await deleteOrganisation(deletePassword);
            organisation = null;
            if (session.user) {
                const currentRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
                setUser({
                    ...session.user,
                    roles: currentRoles.filter((role) => role !== "OWNER"),
                });
            }
            dialog = null;
            await refreshSession();
            gooeyToast.info("Vineyard deleted", {
                description: "The organisation has been permanently removed.",
            });
            window.location.href = "/";
        } catch (error) {
            gooeyToast.error("Could not delete the organisation", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            pending = false;
        }
    };
</script>

{#if !isOwner}
    <p class="text-sm text-zinc-700">
        Only the organisation owner can edit or delete vineyard settings.
    </p>
{:else if loading}
    <p class="text-sm text-zinc-700">Loading vineyard settings...</p>
{:else if loadError}
    <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
{:else if organisation}
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section
            class="rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
            aria-label="Vineyard settings"
        >
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    {#if organisation.id && organisation.logoPath}
                        <img
                            src="{getOrganisationLogoByIdUrl(organisation.id)}?t={logoTimestamp}"
                            alt="Vineyard logo"
                            class="h-24 w-24 shrink-0 rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] object-contain p-1.5"
                            onerror={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    {/if}
                    <div class="flex flex-col gap-1.5">
                        <div class="flex flex-wrap items-center gap-2.5">
                            <h2 class="text-2xl font-bold text-[#3f2e22]">
                                {organisation.name || "Your vineyard"}
                            </h2>
                            <StatusBadge label="Owner" tone="dark" />
                        </div>
                        <p class="max-w-xl text-sm leading-relaxed text-zinc-700">
                            {organisation.motto ||
                                "Manage your vineyard identity, address, tax identification, and official logo."}
                        </p>
                        {#if organisation.logoPath}
                            <div>
                                <button
                                    type="button"
                                    disabled={pending}
                                    onclick={() => void handleRemoveLogo()}
                                    class="cursor-pointer text-xs font-semibold text-[#8f3d32] hover:underline disabled:opacity-50"
                                >
                                    Remove current logo
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <div class="w-44">
                        <Button
                            svg={editIcon}
                            text="Edit vineyard"
                            isFolded={false}
                            gentle={true}
                            class="bg-[#6b4f3a] fill-white text-white"
                            onClick={openEdit}
                        />
                    </div>
                    <div class="w-44">
                        <Button
                            svg={closeIcon}
                            text="Delete vineyard"
                            isFolded={false}
                            gentle={true}
                            class="bg-[#8f3d32] fill-white text-white"
                            onClick={openDelete}
                        />
                    </div>
                </div>
            </div>

            <dl class="mt-6 grid grid-cols-1 gap-3 border-t border-[#e4d8cb] pt-5 sm:grid-cols-2">
                <div class="rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] px-4 py-3">
                    <dt class="text-xs font-medium text-zinc-500">City</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#3f2e22]">
                        {display(organisation.city)}
                    </dd>
                </div>
                <div class="rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] px-4 py-3">
                    <dt class="text-xs font-medium text-zinc-500">Street</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#3f2e22]">
                        {display(organisation.street)}
                    </dd>
                </div>
                <div class="rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] px-4 py-3">
                    <dt class="text-xs font-medium text-zinc-500">Postal code</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#3f2e22]">
                        {display(organisation.postalCode)}
                    </dd>
                </div>
                <div class="rounded-xl border border-[#e4d8cb] bg-[#fbf7f2] px-4 py-3">
                    <dt class="text-xs font-medium text-zinc-500">Tax ID</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#3f2e22]">
                        {display(organisation.taxId)}
                    </dd>
                </div>
            </dl>
        </section>
    </div>
{/if}

{#if dialog === "edit"}
    <FormWindow
        title="Edit vineyard"
        showBreadcrumbs={false}
        acceptText="Save"
        wide={sideBySide.current}
        onClose={() => (dialog = null)}
        onCancel={() => (dialog = null)}
        onAccept={() => void saveOrganisation()}
    >
        <OrganisationFields
            bind:name
            bind:city
            bind:street
            bind:postalCode
            bind:taxId
            bind:motto
            bind:logoFile
            {logoPreviewUrl}
            {organisation}
            {logoTimestamp}
            {nameInvalid}
            {cityInvalid}
            sideBySide={sideBySide.current}
            {onLogoFileChange}
        />
    </FormWindow>
{/if}

{#if dialog === "delete"}
    <FormWindow
        title="Delete vineyard"
        showBreadcrumbs={false}
        showActions={false}
        onClose={() => (dialog = null)}
    >
        <form
            class="flex flex-col gap-4"
            novalidate
            onsubmit={(event) => {
                event.preventDefault();
                void submitDelete();
            }}
        >
            <p class="text-lg leading-relaxed text-zinc-800">
                Deleting the vineyard removes it for every member. Enter your password to confirm.
            </p>
            <InputField
                label="Password"
                type="password"
                placeholder="Please enter your password"
                autocomplete="current-password"
                bind:value={deletePassword}
                svg={passwordIcon}
                invalid={deletePasswordMissing}
            />
            <div class="flex flex-col gap-4 px-1">
                <Button
                    type="submit"
                    svg={closeIcon}
                    text="Delete vineyard"
                    isFolded={false}
                    gentle={true}
                    class="bg-[#8f3d32] fill-white text-white"
                />
                <button
                    type="button"
                    class="h-12 w-full cursor-pointer rounded-lg border border-[#c4b6a6] text-zinc-800 hover:bg-[#efe6dc]"
                    onclick={() => (dialog = null)}
                >
                    Cancel
                </button>
            </div>
        </form>
    </FormWindow>
{/if}

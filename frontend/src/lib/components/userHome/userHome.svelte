<script lang="ts">
    import { onMount } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { session } from "$lib/stores/session.svelte";
    import CreateVineyardButton from "../userMenu/createVineyardButton.svelte";
    import InvitationButton from "../userMenu/invitationButton.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import { getUserInfo } from "$lib/functions/getUserInfo";
    import nameIcon from "$lib/assets/name.svg?raw";
    import cityIcon from "$lib/assets/city.svg?raw";
    import streetIcon from "$lib/assets/street.svg?raw";
    import postalCodeIcon from "$lib/assets/postal_code.svg?raw";
    import taxIcon from "$lib/assets/tax.svg?raw";
    import mottoIcon from "$lib/assets/motto.svg?raw";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import passwordIcon from "$lib/assets/password.svg?raw";
    import {
        acceptInvitation,
        createOrganisation,
        deleteOrganisation,
        getOrganisation,
        getUserInvitations,
        leaveOrganisation,
        updateOrganisation,
        uploadOrganisationLogo,
        getOrganisationLogoUrl,
        type Organisation,
        type OrganisationInvitation,
    } from "$lib/api/organisation";

    let invitations = $state<OrganisationInvitation[]>([]);
    let membership = $state("NONE");
    let roles = $state<string[]>([]);
    let organisation = $state<Organisation | null>(null);
    let ready = $state(false);
    let dialog = $state<"create" | "edit" | "invite" | "delete" | "leave" | null>(null);
    let formError = $state("");
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
    const invited = $derived(invitations.length > 0);
    const isOwner = $derived(roles.includes("OWNER"));
    const isMember = $derived(membership === "MEMBER" || isOwner);
    const nameInvalid = $derived(showErrors && name.trim().length === 0);
    const cityInvalid = $derived(showErrors && city.trim().length === 0);
    const deletePasswordMissing = $derived(showErrors && deletePassword.length === 0);

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

    onMount(async () => {
        if (!session.user) {
            ready = true;
            return;
        }

        try {
            const info = await getUserInfo();
            membership = typeof info.membershipStatus === "string" ? info.membershipStatus : "NONE";
            roles = Array.isArray(info.roles)
                ? info.roles.filter((role: unknown): role is string => typeof role === "string")
                : [];
        } catch {
            membership = "NONE";
            roles = [];
        }

        if (roles.includes("OWNER")) {
            try {
                organisation = await getOrganisation();
            } catch {
                organisation = null;
            }
        }

        try {
            invitations = await getUserInvitations();
        } catch {
            invitations = [];
        }
        ready = true;
    });

    const openCreate = () => {
        fillForm(null);
        showErrors = false;
        dialog = "create";
    };

    const openEdit = () => {
        fillForm(organisation);
        showErrors = false;
        dialog = "edit";
    };

    const openInvite = () => {
        formError = "";
        dialog = "invite";
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

    const submitOrganisation = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        const messages = organisationMessages();
        if (messages.length > 0) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            organisation = await createOrganisation(draft());
            membership = "MEMBER";
            if (!roles.includes("OWNER")) {
                roles = [...roles, "OWNER"];
            }
            if (logoFile) {
                try {
                    await uploadOrganisationLogo(logoFile);
                    logoTimestamp = Date.now();
                } catch {
                    // logo upload failure is non-critical
                }
            }
            dialog = null;
            alert("The organisation is ready. You are its owner.");
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not create the organisation.");
        } finally {
            pending = false;
        }
    };

    const saveOrganisation = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        const messages = organisationMessages();
        if (messages.length > 0) {
            alert(messages.join("\n"));
            return;
        }

        pending = true;
        try {
            organisation = await updateOrganisation(draft());
            if (logoFile) {
                try {
                    await uploadOrganisationLogo(logoFile);
                    logoTimestamp = Date.now();
                } catch {
                    // logo upload failure is non-critical
                }
            }
            dialog = null;
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not update the organisation.");
        } finally {
            pending = false;
        }
    };

    const submitDelete = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        if (deletePassword.length === 0) {
            alert("Enter your password.");
            return;
        }

        pending = true;
        try {
            await deleteOrganisation(deletePassword);
            organisation = null;
            membership = "NONE";
            roles = roles.filter((role) => role !== "OWNER");
            dialog = null;
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not delete the organisation.");
        } finally {
            pending = false;
        }
    };

    const confirmLeave = async () => {
        if (pending) {
            return;
        }
        pending = true;
        try {
            await leaveOrganisation();
            membership = "NONE";
            dialog = null;
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not leave the vineyard.");
        } finally {
            pending = false;
        }
    };

    const joinOrganisation = async () => {
        if (pending) {
            return;
        }
        pending = true;
        formError = "";
        try {
            await acceptInvitation();
            window.location.href = "/workers";
        } catch (error) {
            formError = error instanceof Error ? error.message : "Could not join the organisation.";
            pending = false;
        }
    };
</script>

{#snippet organisationFields()}
    <div class={["org-fields", sideBySide.current && "is-side"]}>
        <InputField class="field-name" label="Name" placeholder="Vineyard name" bind:value={name} svg={nameIcon} invalid={nameInvalid} />
        <InputField class="field-city" label="City" placeholder="City" bind:value={city} svg={cityIcon} invalid={cityInvalid} />
        <InputField class="field-street" label="Street" placeholder="Street" bind:value={street} svg={streetIcon} />
        <InputField class="field-postal" label="Postal code" placeholder="00-000" bind:value={postalCode} svg={postalCodeIcon} />
        <InputField class="field-tax" label="Tax ID" placeholder="Tax ID" bind:value={taxId} svg={taxIcon} />
        <InputField class="field-motto" label="Motto" placeholder="Motto" bind:value={motto} svg={mottoIcon} />
        <div class="logo-field">
            <span class="text-sm text-zinc-600">Logo</span>
            <label class="logo-upload-label" aria-label="Choose a logo image">
                {#if logoPreviewUrl}
                    <img src={logoPreviewUrl} alt="Logo preview" class="logo-preview" />
                {:else if organisation?.logoPath}
                    <img src="{getOrganisationLogoUrl()}?t={logoTimestamp}" alt="Current logo" class="logo-preview" />
                {:else}
                    <span class="logo-placeholder">Click to upload logo</span>
                {/if}
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="sr-only"
                    onchange={onLogoFileChange}
                />
            </label>
            {#if logoFile}
                <p class="text-xs text-zinc-500 mt-1">{logoFile.name}</p>
            {/if}
        </div>
    </div>
{/snippet}

<div class="flex h-full min-h-full flex-col items-center justify-center overflow-y-auto p-8">
    {#if !session.user}
        <section class="flex min-h-[50vh] items-center justify-center text-zinc-700">
            <p class="text-lg">Sign in to see your menu.</p>
        </section>
    {:else if !ready}
        <p class="text-lg text-zinc-700">Loading your vineyard...</p>
    {:else if isOwner}
        <section class="home-card" aria-label="Vineyard">
            {#if organisation?.logoPath}
                <img
                    src="{getOrganisationLogoUrl()}?t={logoTimestamp}"
                    alt="Vineyard logo"
                    class="org-logo"
                />
            {/if}
            <h2>{organisation?.name || "Your vineyard"}</h2>
            <p>
                {#if organisation?.motto}
                    {organisation.motto}
                {:else}
                    This vineyard is yours. Keep its name, place and motto current, or close it when the work is done.
                {/if}
            </p>
            <div class="flex w-full flex-wrap justify-center gap-3">
                <div class="w-52">
                    <Button svg={editIcon} text="Edit vineyard" isFolded={false} gentle={true} class="bg-[#6b4f3a] text-white fill-white" onClick={openEdit} />
                </div>
                <div class="w-52">
                    <Button svg={closeIcon} text="Delete vineyard" isFolded={false} gentle={true} class="bg-[#8f3d32] text-white fill-white" onClick={openDelete} />
                </div>
            </div>
        </section>
    {:else if isMember}
        <section class="home-card" aria-label="Vineyard">
            <img
                src="{getOrganisationLogoUrl()}?t={logoTimestamp}"
                alt="Vineyard logo"
                class="org-logo"
                onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h2>You are part of the vineyard.</h2>
            <p>
                The rows, the work and the harvest are open to you. Leave only when you are ready to step away.
            </p>
            <div class="w-56">
                <Button svg={closeIcon} text="Leave vineyard" isFolded={false} gentle={true} class="bg-[#8f3d32] text-white fill-white" onClick={() => (dialog = "leave")} />
            </div>
        </section>
    {:else}
        <section class="flex flex-wrap gap-4" aria-label="User menu">
            <CreateVineyardButton disabled={!ready || isMember} onClick={openCreate} />
            <InvitationButton disabled={!ready || !invited} onClick={openInvite} />
        </section>
    {/if}
</div>

{#if dialog === "create" || dialog === "edit"}
    <FormWindow
        title={dialog === "edit" ? "Edit vineyard" : "Create organisation"}
        showBreadcrumbs={false}
        acceptText={dialog === "edit" ? "Save" : "Create"}
        wide={sideBySide.current}
        onClose={() => (dialog = null)}
        onCancel={() => (dialog = null)}
        onAccept={() => void (dialog === "edit" ? saveOrganisation() : submitOrganisation())}
    >
        {@render organisationFields()}
    </FormWindow>
{/if}

{#if dialog === "delete"}
    <FormWindow
        title="Delete vineyard"
        showBreadcrumbs={false}
        showActions={false}
        onClose={() => (dialog = null)}
    >
        <form class="flex flex-col gap-4" novalidate onsubmit={(event) => { event.preventDefault(); void submitDelete(); }}>
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
                <Button type="submit" svg={closeIcon} text="Delete vineyard" isFolded={false} gentle={true} class="bg-[#8f3d32] text-white fill-white" />
                <button type="button" class="h-12 w-full cursor-pointer rounded-lg border border-[#c4b6a6] text-zinc-800 hover:bg-[#efe6dc]" onclick={() => (dialog = null)}>
                    Cancel
                </button>
            </div>
        </form>
    </FormWindow>
{/if}

{#if dialog === "leave"}
    <ConfirmationDialog
        title="Leave vineyard"
        text="Leave the vineyard? You will need a new invitation before you can work here again."
        acceptText="Leave"
        onClose={() => (dialog = null)}
        onCancel={() => (dialog = null)}
        onAccept={() => void confirmLeave()}
    />
{/if}

{#if dialog === "invite"}
    <FormWindow
        title="Organisation invitation"
        showBreadcrumbs={false}
        acceptText="Join"
        onClose={() => (dialog = null)}
        onCancel={() => (dialog = null)}
        onAccept={() => void joinOrganisation()}
    >
        <div class="flex flex-col gap-3 text-lg text-zinc-800">
            <p>You have been invited to join:</p>
            <ul class="list-disc pl-5">
                {#each invitations as invitation (invitation.organisationId)}
                    <li>{invitation.organisationName}</li>
                {/each}
            </ul>
            {#if formError}
                <p class="text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

<style>
    @reference "../../../app.css";

    .home-card {
        display: flex;
        width: 100%;
        max-width: 36rem;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        border-radius: 1.5rem;
        border: 1px solid #d9cbbd;
        background: #f7f1ea;
        padding: 2.5rem 2rem;
        text-align: center;
        color: #27272a;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }

    .home-card h2 {
        font-size: 1.875rem;
        line-height: 2.25rem;
        font-weight: 700;
        color: #3f2e22;
    }

    .home-card p {
        font-size: 1.125rem;
        line-height: 1.75rem;
    }

    .org-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .org-fields.is-side {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
            "name city"
            "street postal"
            "tax motto"
            "logo logo";
        align-items: start;
        column-gap: 1.25rem;
        row-gap: 1rem;
    }

    .org-fields.is-side :global(.field-name) {
        grid-area: name;
    }

    .org-fields.is-side :global(.field-city) {
        grid-area: city;
    }

    .org-fields.is-side :global(.field-street) {
        grid-area: street;
    }

    .org-fields.is-side :global(.field-postal) {
        grid-area: postal;
    }

    .org-fields.is-side :global(.field-tax) {
        grid-area: tax;
    }

    .org-fields.is-side :global(.field-motto) {
        grid-area: motto;
    }

    .org-fields.is-side .logo-field {
        grid-area: logo;
    }

    .logo-field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .logo-upload-label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 10rem;
        border-radius: 0.75rem;
        border: 2px dashed #c4b6a6;
        background: #fdfaf7;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.2s;
    }

    .logo-upload-label:hover {
        border-color: #8c735c;
    }

    .logo-preview {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .logo-placeholder {
        font-size: 0.875rem;
        color: #a89180;
    }

    .org-logo {
        width: 7rem;
        height: 7rem;
        object-fit: contain;
        border-radius: 0.75rem;
    }
</style>

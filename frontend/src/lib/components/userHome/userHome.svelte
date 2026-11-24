<script lang="ts">
    import { onMount } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { refreshSession, session, setUser } from "$lib/stores/session.svelte";
    import { gooeyToast } from "goey-toast-svelte";
    import CreateVineyardButton from "../userMenu/createVineyardButton.svelte";
    import InvitationButton from "../userMenu/invitationButton.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import OrganisationFields from "./organisationFields.svelte";
    import OwnerDashboard from "$lib/components/dashboard/ownerDashboard.svelte";
    import EmployeeDashboard from "$lib/components/dashboard/employeeDashboard.svelte";
    import { getUserInfo } from "$lib/functions/getUserInfo";
    import {
        acceptInvitation,
        createOrganisation,
        getOrganisation,
        getUserInvitations,
        uploadOrganisationLogo,
        getOrganisationLogoByIdUrl,
        type Organisation,
        type OrganisationInvitation,
    } from "$lib/api/organisation";

    let invitation = $state<OrganisationInvitation | null>(null);
    let membership = $state("NONE");
    let roles = $state<string[]>([]);
    let organisation = $state<Organisation | null>(null);
    let ready = $state(false);
    let dialog = $state<"create" | "invite" | null>(null);
    let showErrors = $state(false);
    let pending = $state(false);

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
    const invited = $derived(invitation !== null);
    const isOwner = $derived(roles.includes("OWNER"));
    const isMember = $derived(membership === "MEMBER" || isOwner);
    const nameInvalid = $derived(showErrors && name.trim().length === 0);
    const cityInvalid = $derived(showErrors && city.trim().length === 0);
    const inviteName = $derived(organisation?.name || invitation?.organisationName || "");
    const inviteMotto = $derived(organisation?.motto?.trim() || "");
    const inviteStreet = $derived(organisation?.street?.trim() || "");
    const invitePostalCode = $derived(organisation?.postalCode?.trim() || "");
    const inviteCity = $derived(organisation?.city?.trim() || "");
    const inviteHasAddress = $derived(
        inviteStreet.length > 0 || invitePostalCode.length > 0 || inviteCity.length > 0,
    );
    const invitePlace = $derived([invitePostalCode, inviteCity].filter(Boolean).join(" "));
    const inviteLogoUrl = $derived(
        organisation?.id && organisation?.logoPath
            ? `${getOrganisationLogoByIdUrl(organisation.id)}?t=${logoTimestamp}`
            : null,
    );

    const resetForm = () => {
        name = "";
        city = "";
        street = "";
        postalCode = "";
        taxId = "";
        motto = "";
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
            if (info.organisation) {
                organisation = info.organisation;
            }
        } catch {
            membership = "NONE";
            roles = [];
        }

        if (roles.includes("OWNER")) {
            try {
                organisation = await getOrganisation();
            } catch {
                // keep organisation from info if getOrganisation fails
            }
        }

        try {
            invitation = await getUserInvitations();
        } catch {
            invitation = null;
        }
        ready = true;
    });

    const openCreate = () => {
        resetForm();
        showErrors = false;
        dialog = "create";
    };

    const openInvite = () => {
        dialog = "invite";
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
            const createTask = (async () => {
                organisation = await createOrganisation(draft());
                membership = "MEMBER";
                if (!roles.includes("OWNER")) {
                    roles = [...roles, "OWNER"];
                }
                if (session.user) {
                    const currentRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
                    if (!currentRoles.includes("OWNER")) {
                        setUser({
                            ...session.user,
                            roles: [...currentRoles, "OWNER"],
                        });
                    }
                }
                if (logoFile) {
                    try {
                        await uploadOrganisationLogo(logoFile);
                        logoTimestamp = Date.now();
                        organisation = await getOrganisation();
                    } catch {
                        gooeyToast.warning("Logo upload skipped", {
                            description: "Vineyard created, but the logo could not be uploaded.",
                        });
                    }
                }
                dialog = null;
                await refreshSession();
            })();

            gooeyToast.promise(createTask, {
                loading: "Creating organisation...",
                success: "Organisation created",
                error: (err) =>
                    err instanceof Error ? err.message : "Could not create the organisation.",
                description: {
                    success: "The organisation is ready. You are its owner.",
                },
            });

            await createTask;
        } catch {
            // Handled via gooeyToast.promise
        } finally {
            pending = false;
        }
    };

    const joinOrganisation = async () => {
        if (pending) {
            return;
        }
        pending = true;
        gooeyToast.dismiss({ type: ["error", "warning"] });
        try {
            await acceptInvitation();
            gooeyToast.success("Invitation accepted", {
                description: `Welcome to ${inviteName || "the vineyard"}!`,
            });
            window.location.href = "/workers";
        } catch (error) {
            gooeyToast.error("Could not join the organisation", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
            pending = false;
        }
    };
</script>

<div
    class={[
        "flex min-h-full w-full flex-col overflow-y-auto",
        session.user && ready && (isOwner || isMember)
            ? "items-stretch justify-start p-4 sm:p-6"
            : "h-full items-center justify-center p-8",
    ]}
>
    {#if !session.user}
        <section class="flex min-h-[50vh] items-center justify-center text-zinc-700">
            <p class="text-lg">Sign in to see your menu.</p>
        </section>
    {:else if !ready}
        <p class="text-lg text-zinc-700">Loading your vineyard...</p>
    {:else if isOwner}
        <OwnerDashboard {organisation} {logoTimestamp} />
    {:else if isMember}
        <EmployeeDashboard {organisation} {roles} {logoTimestamp} />
    {:else}
        <section class="flex flex-col items-center gap-4" aria-label="User menu">
            <div class="flex flex-wrap justify-center gap-4">
                <CreateVineyardButton disabled={!ready || isMember} onClick={openCreate} />
                <InvitationButton disabled={!ready || !invited} onClick={openInvite} />
            </div>
            <p class="text-xs text-zinc-600">
                You can also manage vineyard membership anytime in your
                <a href="/profile" class="font-semibold text-[#6b4f3a] underline hover:text-[#3f2e22]">
                    Profile
                </a>.
            </p>
        </section>
    {/if}
</div>

{#if dialog === "create"}
    <FormWindow
        title="Create organisation"
        showBreadcrumbs={false}
        acceptText="Create"
        wide={sideBySide.current}
        onClose={() => (dialog = null)}
        onCancel={() => (dialog = null)}
        onAccept={() => void submitOrganisation()}
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
            organisation={null}
            {logoTimestamp}
            {nameInvalid}
            {cityInvalid}
            sideBySide={sideBySide.current}
            {onLogoFileChange}
        />
    </FormWindow>
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
        <div class="invite-preview" aria-label="Inviting organisation">
            <p class="invite-lead">You have been invited to join</p>
            {#if inviteLogoUrl}
                <img
                    src={inviteLogoUrl}
                    alt="Organisation logo"
                    class="org-logo"
                    onerror={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />
            {/if}
            <h3 class="invite-name">{inviteName}</h3>
            {#if inviteMotto}
                <p class="invite-motto">{inviteMotto}</p>
            {/if}
            {#if inviteHasAddress}
                <div class="invite-address">
                    {#if inviteStreet}
                        <p>{inviteStreet}</p>
                    {/if}
                    {#if invitePlace}
                        <p>{invitePlace}</p>
                    {/if}
                </div>
            {/if}
        </div>
    </FormWindow>
{/if}

<style>
    @reference "../../../app.css";

    .org-logo {
        width: 7rem;
        height: 7rem;
        object-fit: contain;
        border-radius: 0.75rem;
    }

    .invite-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        text-align: center;
        color: #27272a;
    }

    .invite-lead {
        font-size: 1.25rem;
        line-height: 1.75rem;
        color: #71717a;
    }

    .invite-name {
        font-size: 1.75rem;
        line-height: 2.25rem;
        font-weight: 700;
        color: #3f2e22;
    }

    .invite-motto {
        max-width: 28rem;
        font-size: 1.125rem;
        line-height: 1.75rem;
        font-style: italic;
        color: #52525b;
    }

    .invite-address {
        margin-top: 0.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        font-size: 1rem;
        line-height: 1.5rem;
        color: #3f3f46;
    }
</style>

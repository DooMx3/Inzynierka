<script lang="ts">
    import { onMount } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { gooeyToast } from "goey-toast-svelte";
    import closeIcon from "$lib/assets/close.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import OrganisationFields from "$lib/components/userHome/organisationFields.svelte";
    import CreateVineyardButton from "$lib/components/userMenu/createVineyardButton.svelte";
    import InvitationButton from "$lib/components/userMenu/invitationButton.svelte";
    import {
        acceptInvitation,
        createOrganisation,
        getOrganisation,
        getOrganisationLogoByIdUrl,
        getUserInvitations,
        leaveOrganisation,
        uploadOrganisationLogo,
        type Organisation,
        type OrganisationInvitation,
    } from "$lib/api/organisation";
    import { getUserInfo } from "$lib/functions/getUserInfo";
    import { refreshSession, session, setUser } from "$lib/stores/session.svelte";

    let membership = $state("NONE");
    let roles = $state<string[]>([]);
    let organisation = $state<Organisation | null>(null);
    let invitation = $state<OrganisationInvitation | null>(null);
    let loading = $state(true);

    let dialog = $state<"leave" | "create" | "invite" | null>(null);
    let pending = $state(false);
    let showErrors = $state(false);

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
    const isOwner = $derived(roles.includes("OWNER"));
    const isMember = $derived(membership === "MEMBER" && !isOwner);
    const isWorker = $derived(roles.includes("WORKER"));
    const isOenologist = $derived(roles.includes("OENOLOGIST"));
    const invited = $derived(invitation !== null);
    const nameInvalid = $derived(showErrors && name.trim().length === 0);
    const cityInvalid = $derived(showErrors && city.trim().length === 0);

    const addressLine = $derived.by(() => {
        const streetPart = organisation?.street?.trim() ?? "";
        const placePart = [organisation?.postalCode?.trim(), organisation?.city?.trim()]
            .filter(Boolean)
            .join(" ");
        return [streetPart, placePart].filter(Boolean).join(", ");
    });

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

    const loadMembership = async () => {
        loading = true;
        try {
            const info = await getUserInfo();
            membership = typeof info.membershipStatus === "string" ? info.membershipStatus : "NONE";
            roles = Array.isArray(info.roles)
                ? info.roles.filter((role: unknown): role is string => typeof role === "string")
                : [];
            organisation = info.organisation ?? null;

            if (roles.includes("OWNER")) {
                try {
                    organisation = await getOrganisation();
                } catch {
                    // keep organisation from info
                }
            }
        } catch {
            membership = "NONE";
            roles = [];
            organisation = null;
        }

        try {
            invitation = await getUserInvitations();
        } catch {
            invitation = null;
        }
        loading = false;
    };

    onMount(() => {
        void loadMembership();
    });

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

    const confirmLeave = async () => {
        if (pending) {
            return;
        }
        pending = true;
        try {
            await leaveOrganisation();
            organisation = null;
            membership = "NONE";
            roles = roles.filter((role) => role !== "WORKER" && role !== "OENOLOGIST");
            if (session.user) {
                const currentRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
                setUser({
                    ...session.user,
                    roles: currentRoles.filter((role) => role !== "WORKER" && role !== "OENOLOGIST"),
                });
            }
            dialog = null;
            await refreshSession();
            gooeyToast.info("Left vineyard", {
                description: "You are no longer a member of this organisation.",
            });
        } catch (error) {
            gooeyToast.error("Could not leave the vineyard", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            pending = false;
        }
    };

    const openCreate = () => {
        resetForm();
        showErrors = false;
        dialog = "create";
    };

    const submitOrganisation = async () => {
        if (pending) {
            return;
        }
        showErrors = true;
        gooeyToast.dismiss({ type: ["error", "warning"] });
        const messages: string[] = [];
        if (name.trim().length === 0) {
            messages.push("Enter the organisation name.");
        }
        if (city.trim().length === 0) {
            messages.push("Enter the city.");
        }
        if (messages.length > 0) {
            gooeyToast.warning("Check vineyard details", {
                description: messages.join(" "),
            });
            return;
        }

        pending = true;
        try {
            organisation = await createOrganisation({
                name: name.trim(),
                city: city.trim(),
                street: street.trim(),
                postalCode: postalCode.trim(),
                taxId: taxId.trim(),
                motto: motto.trim(),
            });
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
            gooeyToast.success("Organisation created", {
                description: "The organisation is ready. You are its owner.",
            });
        } catch (error) {
            gooeyToast.error("Could not create the organisation", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
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
            window.location.href = "/";
        } catch (error) {
            gooeyToast.error("Could not join the organisation", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
            pending = false;
        }
    };
</script>

<section
    class="w-full rounded-3xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-zinc-800 shadow-sm"
    aria-label="Vineyard membership"
>
    <div class="mb-4 flex items-center justify-between gap-2">
        <h2 class="text-xl font-bold text-[#3f2e22]">Vineyard Membership</h2>
        {#if isOwner}
            <StatusBadge label="Owner" tone="dark" />
        {:else if isMember}
            <div class="flex flex-wrap items-center gap-1.5">
                {#if isWorker}
                    <StatusBadge label="Vineyard Worker" tone="primary" />
                {/if}
                {#if isOenologist}
                    <StatusBadge label="Oenologist" tone="secondary" />
                {/if}
                {#if !isWorker && !isOenologist}
                    <StatusBadge label="Member" tone="neutral" />
                {/if}
            </div>
        {/if}
    </div>

    {#if loading}
        <p class="text-sm text-zinc-700">Loading vineyard membership...</p>
    {:else if isOwner}
        <div class="flex flex-col gap-4 rounded-2xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
            <div class="flex items-center gap-3">
                {#if organisation?.id && organisation?.logoPath}
                    <img
                        src="{getOrganisationLogoByIdUrl(organisation.id)}?t={logoTimestamp}"
                        alt="Vineyard logo"
                        class="h-14 w-14 shrink-0 rounded-xl border border-[#d9cbbd] bg-white object-contain p-1"
                        onerror={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                {/if}
                <div class="min-w-0">
                    <p class="truncate text-lg font-bold text-[#3f2e22]">
                        {organisation?.name || "Your vineyard"}
                    </p>
                    {#if addressLine}
                        <p class="text-xs text-zinc-600">{addressLine}</p>
                    {/if}
                </div>
            </div>
            <p class="text-sm text-zinc-700">
                Vineyard details, logo, and deletion controls are located in the owner Management section.
            </p>
            <div>
                <a
                    href="/management/vineyard"
                    class="inline-flex items-center rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                >
                    Open Vineyard Management →
                </a>
            </div>
        </div>
    {:else if isMember}
        <div class="flex flex-col gap-4">
            <div class="flex items-start gap-4 rounded-2xl border border-[#e4d8cb] bg-[#fbf7f2] p-4">
                {#if organisation?.id && organisation?.logoPath}
                    <img
                        src="{getOrganisationLogoByIdUrl(organisation.id)}?t={logoTimestamp}"
                        alt="Vineyard logo"
                        class="h-16 w-16 shrink-0 rounded-xl border border-[#d9cbbd] bg-white object-contain p-1"
                        onerror={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                {/if}
                <div class="flex min-w-0 flex-col gap-1">
                    <h3 class="text-lg font-bold text-[#3f2e22]">
                        {organisation?.name || "Assigned vineyard"}
                    </h3>
                    {#if organisation?.motto}
                        <p class="text-sm italic text-zinc-700">{organisation.motto}</p>
                    {/if}
                    {#if addressLine}
                        <p class="text-xs text-zinc-500">{addressLine}</p>
                    {/if}
                </div>
            </div>

            <p class="text-sm text-zinc-600">
                Leaving the vineyard revokes your operational access until an owner invites you again.
            </p>

            <div class="px-1">
                <Button
                    svg={closeIcon}
                    text="Leave vineyard"
                    isFolded={false}
                    gentle={true}
                    class="bg-[#8f3d32] fill-white text-white"
                    onClick={() => (dialog = "leave")}
                />
            </div>
        </div>
    {:else}
        <div class="flex flex-col gap-4">
            <p class="text-sm leading-relaxed text-zinc-700">
                You do not belong to any vineyard yet. Create your own vineyard or accept a pending invitation from an owner.
            </p>
            <div class="flex flex-wrap justify-center gap-4">
                <CreateVineyardButton disabled={loading} onClick={openCreate} />
                <InvitationButton disabled={loading || !invited} onClick={() => (dialog = "invite")} />
            </div>
        </div>
    {/if}
</section>

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
        <div class="flex flex-col items-center gap-3 text-center text-zinc-800" aria-label="Inviting organisation">
            <p class="text-lg text-zinc-500">You have been invited to join</p>
            {#if inviteLogoUrl}
                <img
                    src={inviteLogoUrl}
                    alt="Organisation logo"
                    class="h-24 w-24 rounded-xl object-contain"
                    onerror={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />
            {/if}
            <h3 class="text-2xl font-bold text-[#3f2e22]">{inviteName}</h3>
            {#if inviteMotto}
                <p class="max-w-md text-base italic text-zinc-600">{inviteMotto}</p>
            {/if}
            {#if inviteHasAddress}
                <div class="text-sm text-zinc-700">
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

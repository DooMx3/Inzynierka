<script lang="ts">
    import { onMount } from "svelte";
    import mailIcon from "$lib/assets/mail.svg?raw";
    import sendIcon from "$lib/assets/send.svg?raw";
    import workerIcon from "$lib/assets/worker.svg?raw";
    import oenologistIcon from "$lib/assets/oenologist.svg?raw";
    import NewEmployeeButton from "$lib/components/buttons/newEmployeeButton.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import EmployeeRecord from "./employeeRecord.svelte";
    import { ApiError } from "$lib/api/auth";
    import { session } from "$lib/stores/session.svelte";
    import { isValidEmail } from "$lib/functions/authFormValidation";
    import {
        addOrganisationRole,
        cancelInvitation,
        getOrganisationMembers,
        getPendingInvitations,
        inviteEmployee,
        removeOrganisationRole,
        type OrganisationRole,
    } from "$lib/api/organisation";
    import { roleLabel, type Employee } from "$lib/types/employee";

    let employees = $state<Employee[]>([]);
    let loadError = $state("");
    let loading = $state(true);

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("name");
    let filter = $state("all");
    let selected = $state<string[]>([]);

    let inviting = $state(false);
    let inviteEmail = $state("");
    let showInviteErrors = $state(false);
    let invitePending = $state(false);

    let editing = $state<Employee | null>(null);
    let workerRole = $state(false);
    let oenologistRole = $state(false);
    let roleError = $state("");
    let rolePending = $state(false);

    let removing = $state<Employee | null>(null);
    let removeError = $state("");
    let removePending = $state(false);

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [members, invitations] = await Promise.all([
                getOrganisationMembers(),
                getPendingInvitations(),
            ]);
            const pendingIds = new Set(invitations.map((invitation) => invitation.userId));
            const fromMembers: Employee[] = members.map((member) => ({
                id: member.id,
                firstname: member.firstname,
                lastname: member.lastname,
                email: member.email,
                roles: member.roles,
                pending: member.membershipStatus === "PENDING" || pendingIds.has(member.id),
            }));
            const known = new Set(fromMembers.map((member) => member.id));
            const invitedOnly: Employee[] = invitations
                .filter((invitation) => !known.has(invitation.userId))
                .map((invitation) => ({
                    id: invitation.userId,
                    firstname: invitation.firstname,
                    lastname: invitation.lastname,
                    email: invitation.email,
                    roles: [],
                    pending: true,
                }));
            employees = [...fromMembers, ...invitedOnly];
            selected = selected.filter((id) => employees.some((employee) => employee.id === id));
        } catch (error) {
            employees = [];
            loadError =
                error instanceof ApiError && error.status === 403
                    ? "Only the organisation owner can manage employees."
                    : error instanceof Error
                      ? error.message
                      : "Could not load employees.";
        } finally {
            loading = false;
        }
    };

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    onMount(() => {
        if (!session.user?.roles.includes("OWNER")) {
            loading = false;
            return;
        }
        void load();
    });

    const visibleEmployees = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = employees.filter((employee) => {
            const haystack = [
                employee.firstname,
                employee.lastname,
                employee.email,
                ...employee.roles.map(roleLabel),
            ]
                .join(" ")
                .toLowerCase();
            if (needle && !haystack.includes(needle)) {
                return false;
            }
            if (filter === "pending") {
                return employee.pending;
            }
            if (filter === "unassigned") {
                return !employee.pending && employee.roles.length === 0;
            }
            if (filter === "WORKER" || filter === "OENOLOGIST" || filter === "OWNER") {
                return employee.roles.includes(filter);
            }
            return true;
        });

        matched.sort((left, right) => {
            if (sort === "email") {
                return left.email.localeCompare(right.email);
            }
            if (sort === "role") {
                return left.roles.map(roleLabel).join(", ").localeCompare(right.roles.map(roleLabel).join(", "));
            }
            return `${left.lastname} ${left.firstname}`.localeCompare(`${right.lastname} ${right.firstname}`);
        });
        return matched;
    });

    const allVisibleSelected = $derived(
        visibleEmployees.length > 0 && visibleEmployees.every((employee) => selected.includes(employee.id)),
    );

    const toggle = (id: string) => {
        selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    };

    const toggleVisible = () => {
        if (allVisibleSelected) {
            const visibleIds = new Set(visibleEmployees.map((employee) => employee.id));
            selected = selected.filter((id) => !visibleIds.has(id));
            return;
        }
        selected = [...new Set([...selected, ...visibleEmployees.map((employee) => employee.id)])];
    };

    const inviteEmailInvalid = $derived(showInviteErrors && !isValidEmail(inviteEmail));

    const openInvite = () => {
        inviteEmail = "";
        showInviteErrors = false;
        inviting = true;
    };

    const sendInvite = async () => {
        if (invitePending) {
            return;
        }
        showInviteErrors = true;
        const email = inviteEmail.trim();
        if (!isValidEmail(email)) {
            alert("Enter a valid email. The person needs an account before they can be invited.");
            return;
        }

        invitePending = true;
        try {
            await inviteEmployee(email);
            inviting = false;
            await load();
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Could not invite this employee. Ask them to register first.",
            );
        } finally {
            invitePending = false;
        }
    };

    const openRoles = (employee: Employee) => {
        editing = employee;
        workerRole = employee.roles.includes("WORKER");
        oenologistRole = employee.roles.includes("OENOLOGIST");
        roleError = "";
    };

    const saveRoles = async () => {
        if (!editing || rolePending) {
            return;
        }

        const changes: { role: OrganisationRole; enabled: boolean }[] = [
            { role: "WORKER", enabled: workerRole },
            { role: "OENOLOGIST", enabled: oenologistRole },
        ];
        rolePending = true;
        roleError = "";
        try {
            for (const change of changes) {
                const hasRole = editing.roles.includes(change.role);
                if (change.enabled && !hasRole) {
                    await addOrganisationRole(editing.id, change.role);
                }
                if (!change.enabled && hasRole) {
                    await removeOrganisationRole(editing.id, change.role);
                }
            }
            editing = null;
            await load();
        } catch (error) {
            roleError = error instanceof Error ? error.message : "Could not update roles.";
        } finally {
            rolePending = false;
        }
    };

    const confirmRemove = async () => {
        if (!removing || removePending) {
            return;
        }
        removePending = true;
        removeError = "";
        try {
            await cancelInvitation(removing.id);
            removing = null;
            await load();
        } catch (error) {
            removeError = error instanceof Error ? error.message : "Could not cancel the invitation.";
        } finally {
            removePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">Only the organisation owner can manage employees.</p>
    {:else}
    <div class="flex justify-end">
        <div class="w-52">
            <NewEmployeeButton onClick={openInvite} />
        </div>
    </div>

    <ResultsToolbar
        bind:query={draftQuery}
        bind:sort
        bind:filter
        onSearch={() => {
            query = draftQuery;
        }}
    />

    {#if loading}
        <p class="text-sm text-zinc-700">Loading employees...</p>
    {:else if loadError}
        <p class="text-sm text-zinc-700">{loadError}</p>
    {:else}
        {#key `${query}|${sort}|${filter}`}
            <ResultsTable rows={visibleEmployees} emptyLabel="No employees match this search.">
                {#snippet head()}
                    <th class="px-4 py-3">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            aria-label="Select all employees"
                            onchange={toggleVisible}
                        />
                    </th>
                    <th class="px-4 py-3 font-bold">First Name</th>
                    <th class="px-4 py-3 font-bold">Last Name</th>
                    <th class="px-4 py-3 font-bold">E-mail</th>
                    <th class="px-4 py-3 font-bold">Roles</th>
                    <th class="px-4 py-3"></th>
                {/snippet}
                {#snippet row(employee)}
                    <EmployeeRecord
                        {employee}
                        selected={selected.includes(employee.id)}
                        onToggle={() => toggle(employee.id)}
                        onChangeRoles={() => openRoles(employee)}
                        onRemove={() => {
                            removeError = "";
                            removing = employee;
                        }}
                    />
                {/snippet}
            </ResultsTable>
        {/key}
    {/if}
    {/if}
</div>

{#if inviting}
    <FormWindow
        title="New employee"
        showBreadcrumbs={false}
        acceptText="Invite"
        acceptIcon={sendIcon}
        onClose={() => (inviting = false)}
        onCancel={() => (inviting = false)}
        onAccept={() => void sendInvite()}
    >
        <div class="flex flex-col gap-4">
            <p class="text-lg leading-relaxed text-zinc-800">
                Enter the email of someone who already has an account. They confirm the invitation on their home page.
            </p>
            <InputField
                label="E-mail"
                type="email"
                placeholder="name@example.com"
                bind:value={inviteEmail}
                svg={mailIcon}
                invalid={inviteEmailInvalid}
            />
        </div>
    </FormWindow>
{/if}

{#if editing}
    <FormWindow
        title="Change roles"
        showBreadcrumbs={false}
        acceptText="Save"
        onClose={() => (editing = null)}
        onCancel={() => (editing = null)}
        onAccept={() => void saveRoles()}
    >
        <div class="flex flex-col gap-4 text-zinc-800">
            <p class="text-lg leading-relaxed text-zinc-800">
                Roles for
                <span class="font-semibold text-[#3f2e22]">{editing.firstname} {editing.lastname}</span>
                <span class="text-zinc-600">({editing.email})</span>
            </p>
            {#if editing.roles.includes("OWNER")}
                <p class="text-sm text-zinc-600">The owner role stays on this account.</p>
            {/if}
            <div class="grid gap-3 sm:grid-cols-2">
                <label
                    class={[
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                        workerRole
                            ? "border-[#6b4f3a] bg-[#efe6dc]"
                            : "border-[#d9cbbd] bg-white hover:border-[#8c735c]",
                    ]}
                >
                    <span class="role-icon mt-0.5 text-[#6b4f3a]" aria-hidden="true">{@html workerIcon}</span>
                    <input
                        type="checkbox"
                        class="mt-1 h-4 w-4 accent-[#6b4f3a]"
                        aria-label="Vineyard worker"
                        bind:checked={workerRole}
                    />
                    <span>
                        <span class="block text-lg font-semibold text-[#3f2e22]">Vineyard worker</span>
                        <span class="mt-1 block text-base font-normal text-zinc-600">
                            Field work, spraying, diseases and harvest.
                        </span>
                    </span>
                </label>
                <label
                    class={[
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                        oenologistRole
                            ? "border-[#6b4f3a] bg-[#efe6dc]"
                            : "border-[#d9cbbd] bg-white hover:border-[#8c735c]",
                    ]}
                >
                    <span class="role-icon mt-0.5 text-[#6b4f3a]" aria-hidden="true">{@html oenologistIcon}</span>
                    <input
                        type="checkbox"
                        class="mt-1 h-4 w-4 accent-[#6b4f3a]"
                        aria-label="Oenologist"
                        bind:checked={oenologistRole}
                    />
                    <span>
                        <span class="block text-lg font-semibold text-[#3f2e22]">Oenologist</span>
                        <span class="mt-1 block text-base font-normal text-zinc-600">
                            Winery batches, from must to bottled wine.
                        </span>
                    </span>
                </label>
            </div>
            {#if roleError}
                <p class="text-sm text-[#8f3d32]" role="alert">{roleError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if removing}
    <ConfirmationDialog
        title="Remove invitation"
        text={removeError || `Cancel the invitation for ${removing.firstname} ${removing.lastname}?`}
        acceptText="Remove"
        onClose={() => (removing = null)}
        onCancel={() => (removing = null)}
        onAccept={() => void confirmRemove()}
    />
{/if}

<style>
    @reference "../../../app.css";

    .role-icon :global(svg) {
        width: 1.75rem;
        height: 1.75rem;
        fill: currentColor;
    }

    .role-icon :global(svg *) {
        fill: currentColor;
    }
</style>

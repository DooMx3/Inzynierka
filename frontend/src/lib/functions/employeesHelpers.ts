import { roleLabel, type Employee } from "$lib/types/employee";
import type { OrganisationMember, PendingInvitation } from "$lib/api/organisation";

export function transformMembersAndInvitations(
    members: OrganisationMember[],
    invitations: PendingInvitation[]
): Employee[] {
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
    return [...fromMembers, ...invitedOnly];
}

export function filterAndSortEmployees(
    employees: Employee[],
    query: string,
    filter: string,
    sort: string
): Employee[] {
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
}

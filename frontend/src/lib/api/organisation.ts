import type { organisationInfo } from "$lib/types/organisationInfo";

export const getUserInvitation = async () => {
    const response = await fetch("/api/user/invitations", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch user invitations");
    }

    const data: organisationInfo = await response.json();
    return data;
}

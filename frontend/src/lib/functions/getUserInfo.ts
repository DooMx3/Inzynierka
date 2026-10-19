export const getUserInfo = async () => {
    const info = await fetch("/api/user/info", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!info.ok) {
        throw new Error("Failed to fetch user info");
    }

    return await info.json();
}

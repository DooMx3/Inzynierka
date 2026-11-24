<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { getBatches, STAGE_LABELS } from "$lib/api/batches";
    import { getEquipmentById, getEquipmentList, type Equipment } from "$lib/api/equipment";
    import {
        resolveEquipmentQrDestination,
        type EquipmentQrResolution,
    } from "$lib/functions/qrRouting";
    import { refreshSession, session } from "$lib/stores/session.svelte";

    type ResolverState =
        | { status: "loading" }
        | { status: "forbidden" }
        | { status: "redirecting"; equipment: Equipment; resolution: Extract<EquipmentQrResolution, { kind: "occupied" | "empty" }> }
        | { status: "unsupported"; equipmentName: string; message: string }
        | { status: "not_found"; message: string };

    const equipmentId = $derived(
        (page.params as Record<string, string | undefined> | undefined)?.id ||
            page.url.pathname.split("/").filter(Boolean).at(-1) ||
            "",
    );

    const hasWineryRole = (roles: string[] | undefined): boolean =>
        Boolean(roles?.some((role) => role === "OENOLOGIST" || role === "OWNER"));

    let state = $state<ResolverState>({ status: "loading" });

    onMount(() => {
        const resolveScan = async () => {
            if (!session.user) {
                await refreshSession();
            }

            if (!session.user) {
                const target = `${page.url.pathname}${page.url.search}`;
                window.location.replace(`/auth?redirectTo=${encodeURIComponent(target)}`);
                return;
            }

            if (!hasWineryRole(session.user.roles)) {
                state = { status: "forbidden" };
                return;
            }

            if (!equipmentId) {
                state = {
                    status: "not_found",
                    message: "Scanned QR link is missing an equipment identifier.",
                };
                return;
            }

            let equipment: Equipment | null = null;
            try {
                const fetched = await getEquipmentById(equipmentId);
                equipment = fetched.id ? fetched : null;
            } catch {
                equipment = null;
            }

            if (!equipment) {
                const list = await getEquipmentList().catch(() => []);
                equipment = list.find((item) => item.id === equipmentId) ?? null;
            }

            if (!equipment) {
                state = {
                    status: "not_found",
                    message: "This piece of equipment could not be found or is no longer active.",
                };
                return;
            }

            const batches = await getBatches().catch(() => []);
            const resolution = resolveEquipmentQrDestination(equipment, batches);

            if (resolution.kind === "unsupported") {
                state = {
                    status: "unsupported",
                    equipmentName: `${equipment.name} (${equipment.type})`,
                    message: resolution.reason,
                };
                return;
            }

            state = {
                status: "redirecting",
                equipment,
                resolution,
            };
            window.location.replace(resolution.url);
        };

        void resolveScan();
    });
</script>

<svelte:head>
    <title>Equipment QR · Vinery</title>
</svelte:head>

<div class="mx-auto flex max-w-lg flex-col items-center px-4 py-8">
    <section
        class="flex w-full flex-col gap-4 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
        aria-live="polite"
    >
        {#if state.status === "loading"}
            <h1 class="text-lg font-bold text-[#3f2e22]">Resolving equipment QR code...</h1>
            <p class="text-sm text-zinc-600">
                Checking vessel status and active production batches.
            </p>
        {:else if state.status === "forbidden"}
            <h1 class="text-lg font-bold text-[#8f3d32]">Winery access required</h1>
            <p class="text-sm leading-relaxed text-zinc-700">
                Winery equipment QR codes require an <strong>Oenologist</strong> or
                <strong>Owner</strong> role to inspect vessels and manage production batches.
            </p>
            <div class="flex flex-wrap gap-2.5 pt-2">
                <a
                    href="/"
                    class="rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                >
                    Back to dashboard
                </a>
            </div>
        {:else if state.status === "redirecting"}
            <h1 class="text-lg font-bold text-[#3f2e22]">
                {state.equipment.name} ({state.equipment.type})
            </h1>
            <p class="text-sm leading-relaxed text-zinc-700">
                {#if state.resolution.kind === "occupied"}
                    Active {STAGE_LABELS[state.resolution.stage].toLowerCase()} batch
                    <strong>{state.resolution.batch.batchNumber}</strong> found — redirecting...
                {:else}
                    Vessel is currently empty — opening the
                    <strong>{STAGE_LABELS[state.resolution.stage].toLowerCase()}</strong> batch creator...
                {/if}
            </p>
            <div class="pt-1">
                <a
                    href={state.resolution.url}
                    class="inline-block rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                >
                    Continue to batch view →
                </a>
            </div>
        {:else if state.status === "unsupported"}
            <h1 class="text-lg font-bold text-[#8f3d32]">Unsupported equipment QR</h1>
            <p class="text-sm font-semibold text-[#3f2e22]">{state.equipmentName}</p>
            <p class="text-sm leading-relaxed text-zinc-700">{state.message}</p>
            <div class="flex flex-wrap gap-2.5 pt-2">
                <a
                    href="/vinery"
                    class="rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                >
                    Go to Vinery
                </a>
                {#if session.user?.roles.includes("OWNER")}
                    <a
                        href="/management/equipment"
                        class="rounded-xl border border-[#6b4f3a] bg-[#fbf7f2] px-4 py-2.5 text-sm font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
                    >
                        Manage equipment
                    </a>
                {/if}
            </div>
        {:else}
            <h1 class="text-lg font-bold text-[#8f3d32]">Equipment not found</h1>
            <p class="text-sm leading-relaxed text-zinc-700">{state.message}</p>
            <div class="flex flex-wrap gap-2.5 pt-2">
                <a
                    href="/vinery"
                    class="rounded-xl bg-[#6b4f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                >
                    Go to Vinery
                </a>
                {#if session.user?.roles.includes("OWNER")}
                    <a
                        href="/management/equipment"
                        class="rounded-xl border border-[#6b4f3a] bg-[#fbf7f2] px-4 py-2.5 text-sm font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
                    >
                        Manage equipment
                    </a>
                {/if}
            </div>
        {/if}
    </section>
</div>

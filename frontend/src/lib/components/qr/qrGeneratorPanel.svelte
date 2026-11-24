<script lang="ts">
    import { onMount } from "svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import QrCodeModal from "$lib/components/qr/qrCodeModal.svelte";
    import { getBatches, type ProductionBatch } from "$lib/api/batches";
    import { getEquipmentList, type Equipment } from "$lib/api/equipment";
    import { getOfferings, type WineOffering } from "$lib/api/offerings";
    import { getOrganisation, type Organisation } from "$lib/api/organisation";
    import {
        buildBottleQrUrl,
        buildEquipmentQrUrl,
        buildVineyardOfferingsUrl,
        isWineryEquipmentType,
    } from "$lib/functions/qrRouting";
    import { session } from "$lib/stores/session.svelte";

    type QrCategory = "EQUIPMENT" | "BOTTLE" | "VINEYARD";

    type TargetOption = {
        value: string;
        label: string;
        subtitle: string;
    };

    const CATEGORY_OPTIONS: { value: QrCategory; label: string }[] = [
        { value: "EQUIPMENT", label: "Winery equipment" },
        { value: "BOTTLE", label: "Wine bottle / offering" },
        { value: "VINEYARD", label: "Vineyard offerings catalog" },
    ];

    let equipmentList = $state<Equipment[]>([]);
    let offerings = $state<WineOffering[]>([]);
    let bottledBatches = $state<ProductionBatch[]>([]);
    let organisation = $state<Organisation | null>(null);
    let loading = $state(true);

    let category = $state<QrCategory>("EQUIPMENT");

    let activeModal = $state<{
        title: string;
        subtitle: string;
        targetUrl: string;
        downloadFilename: string;
    } | null>(null);

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const load = async () => {
        loading = true;
        try {
            const [loadedEquipment, loadedOrg, loadedBottled] = await Promise.all([
                getEquipmentList().catch(() => []),
                getOrganisation().catch(() => null),
                getBatches("BOTTLED").catch(() => []),
            ]);
            equipmentList = loadedEquipment;
            organisation = loadedOrg;
            bottledBatches = loadedBottled;
            offerings = await getOfferings(loadedOrg?.id || undefined).catch(() => []);
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!session.user?.roles.includes("OWNER")) {
            loading = false;
            return;
        }
        void load();
    });

    const wineryEquipmentOptions = $derived<TargetOption[]>(
        equipmentList
            .filter((item) => isWineryEquipmentType(item.type))
            .map((item) => ({
                value: item.id,
                label: `${item.name} (${item.type})`,
                subtitle: `${item.name} (${item.type})`,
            })),
    );

    const bottleTargetOptions = $derived.by<TargetOption[]>(() => {
        const offeredWineIds = new Set(offerings.map((item) => item.wineId).filter(Boolean));
        const offeringOptions: TargetOption[] = offerings.map((offering) => {
            const vintageSuffix = offering.vintageYear ? ` ${offering.vintageYear}` : "";
            return {
                value: offering.id,
                label: `${offering.wineName}${vintageSuffix} (Offering)`,
                subtitle: `${offering.wineName}${vintageSuffix}`,
            };
        });

        const unofferedBatchOptions: TargetOption[] = bottledBatches
            .filter((batch) => !offeredWineIds.has(batch.id))
            .map((batch) => ({
                value: batch.id,
                label: `${batch.batchNumber} · ${batch.name} (Bottled batch)`,
                subtitle: `${batch.batchNumber} · ${batch.name}`,
            }));

        return [...offeringOptions, ...unofferedBatchOptions];
    });

    const vineyardTargetOptions = $derived<TargetOption[]>(
        organisation?.id
            ? [
                  {
                      value: organisation.id,
                      label: `${organisation.name || "Your vineyard"} (Catalog)`,
                      subtitle: organisation.name || "Vineyard Wine Offerings",
                  },
              ]
            : [],
    );

    const targetOptions = $derived<TargetOption[]>(
        category === "EQUIPMENT"
            ? wineryEquipmentOptions
            : category === "BOTTLE"
              ? bottleTargetOptions
              : vineyardTargetOptions,
    );

    let selectedTargetId = $derived(targetOptions[0]?.value ?? "");

    const selectedTarget = $derived(
        targetOptions.find((option) => option.value === selectedTargetId) ?? null,
    );

    const handleGenerate = () => {
        if (!selectedTarget) {
            return;
        }
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const targetUrl =
            category === "EQUIPMENT"
                ? buildEquipmentQrUrl(origin, selectedTarget.value)
                : category === "BOTTLE"
                  ? buildBottleQrUrl(origin, selectedTarget.value)
                  : buildVineyardOfferingsUrl(origin, selectedTarget.value);

        activeModal = {
            title:
                category === "EQUIPMENT"
                    ? "Equipment QR code"
                    : category === "BOTTLE"
                      ? "Wine bottle QR code"
                      : "Vineyard catalog QR code",
            subtitle: selectedTarget.subtitle,
            targetUrl,
            downloadFilename: `qr-${category.toLowerCase()}-${selectedTarget.value}.svg`,
        };
    };
</script>

{#if !isOwner}
    <p class="text-sm text-zinc-700">Only the organisation owner can generate QR codes.</p>
{:else}
    <div class="flex justify-center py-4">
        <section
            class="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
            aria-label="QR code generator"
        >
            <div class="flex flex-col gap-1 border-b border-[#e4d8cb] pb-4">
                <h2 class="text-xl font-bold text-[#3f2e22]">Generate QR code</h2>
                <p class="text-sm text-zinc-600">
                    Create printable SVG labels for winery vessels, wine bottles, or your vineyard catalog.
                </p>
            </div>

            {#if loading}
                <p class="text-sm text-zinc-700">Loading QR targets...</p>
            {:else}
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium text-[#3f2e22]" for="qr-category-select">
                            QR category
                        </label>
                        <DropdownInput
                            id="qr-category-select"
                            class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-xl"
                            options={CATEGORY_OPTIONS}
                            placeholder="Select QR category"
                            bind:value={category}
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium text-[#3f2e22]" for="qr-target-select">
                            Target item
                        </label>
                        <DropdownInput
                            id="qr-target-select"
                            class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-xl"
                            options={targetOptions.map((opt) => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                            placeholder={category === "EQUIPMENT"
                                ? "No winery equipment available"
                                : category === "BOTTLE"
                                  ? "No wine offerings or bottled batches available"
                                  : "No vineyard registered yet"}
                            disabled={targetOptions.length === 0}
                            bind:value={selectedTargetId}
                        />
                        {#if targetOptions.length === 0}
                            <p class="text-xs text-zinc-600">
                                {#if category === "EQUIPMENT"}
                                    Add a Press, Fermentor, Barrel, Tank, Mixer, or Bottling line in Equipment management first.
                                {:else if category === "BOTTLE"}
                                    Create a wine offering or bottled wine batch first to generate a bottle QR code.
                                {:else}
                                    Your vineyard details could not be loaded.
                                {/if}
                            </p>
                        {/if}
                    </div>

                    <div class="flex justify-end border-t border-[#e4d8cb] pt-4">
                        <button
                            type="button"
                            disabled={!selectedTarget}
                            onclick={handleGenerate}
                            class="cursor-pointer rounded-xl bg-[#6b4f3a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3f2e22] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Generate
                        </button>
                    </div>
                </div>
            {/if}
        </section>
    </div>
{/if}

{#if activeModal}
    <QrCodeModal
        title={activeModal.title}
        subtitle={activeModal.subtitle}
        targetUrl={activeModal.targetUrl}
        downloadFilename={activeModal.downloadFilename}
        onClose={() => (activeModal = null)}
    />
{/if}

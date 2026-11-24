<script lang="ts">
    import { onMount } from "svelte";
    import { gooeyToast } from "goey-toast-svelte";
    import editIcon from "$lib/assets/edit.svg?raw";
    import closeIcon from "$lib/assets/close.svg?raw";
    import AddButton from "$lib/components/buttons/addButton.svelte";
    import Button from "$lib/components/buttons/button.svelte";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import QrCodeModal from "$lib/components/qr/qrCodeModal.svelte";
    import StatusBadge from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import TextareaField from "$lib/components/textareaField/textareaField.svelte";
    import { ApiError } from "$lib/api/auth";
    import { getBatches, type ProductionBatch } from "$lib/api/batches";
    import {
        createOffering,
        deleteOffering,
        getOfferings,
        readWinePhotoAsDataUrl,
        updateOffering,
        type WineOffering,
    } from "$lib/api/offerings";
    import { getOrganisation, type Organisation } from "$lib/api/organisation";
    import {
        buildBottleQrUrl,
        buildVineyardOfferingsUrl,
    } from "$lib/functions/qrRouting";
    import { session } from "$lib/stores/session.svelte";

    const CUSTOM_BATCH_VALUE = "__custom__";

    let items = $state<WineOffering[]>([]);
    let bottledBatches = $state<ProductionBatch[]>([]);
    let organisation = $state<Organisation | null>(null);
    let loading = $state(true);
    let loadError = $state("");
    let copiedCatalogLink = $state(false);

    let draftQuery = $state("");
    let query = $state("");
    let sort = $state("name");
    let filter = $state("all");

    let formOpen = $state(false);
    let editingItem = $state<WineOffering | null>(null);
    let formBatchSelection = $state(CUSTOM_BATCH_VALUE);
    let formCustomWineId = $state("");
    let formWineName = $state("");
    let formPrice = $state<string | number | null>("");
    let formDescription = $state("");
    let formImageUrl = $state<string | null>(null);
    let formPhotoFilename = $state("");
    let formError = $state("");
    let formPending = $state(false);
    let showValidation = $state(false);

    let deletingItem = $state<WineOffering | null>(null);
    let deleteError = $state("");
    let deletePending = $state(false);

    let qrModalState = $state<{
        title: string;
        subtitle: string;
        targetUrl: string;
        downloadFilename: string;
    } | null>(null);

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const vineyardCatalogPath = $derived(
        organisation?.id
            ? `/offerings/vineyard/${encodeURIComponent(organisation.id)}`
            : null,
    );

    const vineyardCatalogFullUrl = $derived.by(() => {
        if (!organisation?.id) {
            return "";
        }
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return buildVineyardOfferingsUrl(origin, organisation.id);
    });

    const load = async () => {
        loading = true;
        loadError = "";
        try {
            const [loadedOrg, loadedBottled] = await Promise.all([
                getOrganisation().catch(() => null),
                getBatches("BOTTLED"),
            ]);
            organisation = loadedOrg;
            bottledBatches = loadedBottled;
            items = await getOfferings(loadedOrg?.id);
        } catch (error) {
            items = [];
            loadError =
                error instanceof ApiError && error.status === 403
                    ? "Only the organisation owner can manage wine offerings."
                    : error instanceof Error
                      ? error.message
                      : "Could not load wine offerings.";
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

    const copyCatalogLink = async () => {
        if (!vineyardCatalogFullUrl) {
            return;
        }
        try {
            await navigator.clipboard?.writeText(vineyardCatalogFullUrl);
            copiedCatalogLink = true;
            gooeyToast.success("Catalog link copied", {
                description: "Share this link directly with your vineyard customers.",
            });
            setTimeout(() => {
                copiedCatalogLink = false;
            }, 2500);
        } catch {
            gooeyToast.warning("Copy unavailable", {
                description: vineyardCatalogFullUrl,
            });
        }
    };

    const openBottleQrModal = (item: WineOffering) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        qrModalState = {
            title: "Wine bottle QR code",
            subtitle: `${item.wineName} · ${item.price} PLN`,
            targetUrl: buildBottleQrUrl(origin, item.id),
            downloadFilename: `qr-bottle-${item.id}.svg`,
        };
    };

    const openCatalogQrModal = () => {
        if (!organisation?.id || !vineyardCatalogFullUrl) {
            return;
        }
        qrModalState = {
            title: "Vineyard catalog QR code",
            subtitle: organisation.name || "Vineyard Wine Offerings",
            targetUrl: vineyardCatalogFullUrl,
            downloadFilename: `qr-vineyard-offerings-${organisation.id}.svg`,
        };
    };

    const styleFilterOptions = $derived.by(() => {
        const distinctStyles = Array.from(
            new Set(
                items
                    .map((item) => item.wineStyle ?? "Dry wine")
                    .filter(Boolean),
            ),
        ).sort();
        return [
            { value: "all", label: "All styles" },
            ...distinctStyles.map((style) => ({ value: style, label: style })),
        ];
    });

    const visibleItems = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matched = items.filter((item) => {
            const resolvedStyle = item.wineStyle ?? "Dry wine";
            if (filter !== "all" && resolvedStyle !== filter) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                item.wineName,
                item.wineDescription,
                item.grapeType ?? "",
                resolvedStyle,
                String(item.vintageYear ?? ""),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "price_asc") {
                return left.price - right.price;
            }
            if (sort === "price_desc") {
                return right.price - left.price;
            }
            return left.wineName.localeCompare(right.wineName);
        });

        return matched;
    });

    const batchDropdownOptions = $derived([
        ...bottledBatches.map((batch) => ({
            value: batch.id,
            label: `${batch.batchNumber} · ${batch.name} (${batch.quantity} L)`,
        })),
        { value: CUSTOM_BATCH_VALUE, label: "Custom wine / manual UUID" },
    ]);

    const applyBatchSelection = (selectedValue: string) => {
        formBatchSelection = selectedValue;
        if (selectedValue === CUSTOM_BATCH_VALUE) {
            return;
        }
        const selectedBatch = bottledBatches.find((batch) => batch.id === selectedValue);
        if (selectedBatch) {
            formWineName = selectedBatch.name;
            formDescription = selectedBatch.description || "";
        }
    };

    const handlePhotoSelected = async (event: Event) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        if (!file) {
            return;
        }
        formError = "";
        try {
            formImageUrl = await readWinePhotoAsDataUrl(file);
            formPhotoFilename = file.name;
        } catch (error) {
            formError =
                error instanceof Error ? error.message : "Could not read selected wine photo.";
        } finally {
            input.value = "";
        }
    };

    const clearPhoto = () => {
        formImageUrl = null;
        formPhotoFilename = "";
    };

    const openCreate = () => {
        editingItem = null;
        formError = "";
        showValidation = false;
        formPrice = "";
        formCustomWineId = "";
        formImageUrl = null;
        formPhotoFilename = "";

        const defaultBatch = bottledBatches[0] ?? null;
        if (defaultBatch) {
            formBatchSelection = defaultBatch.id;
            formWineName = defaultBatch.name;
            formDescription = defaultBatch.description || "";
        } else {
            formBatchSelection = CUSTOM_BATCH_VALUE;
            formWineName = "";
            formDescription = "";
        }
        formOpen = true;
    };

    const openEdit = (item: WineOffering) => {
        editingItem = item;
        formError = "";
        showValidation = false;
        const matchingBatch = bottledBatches.find((batch) => batch.id === item.wineId);
        if (matchingBatch) {
            formBatchSelection = matchingBatch.id;
            formCustomWineId = "";
        } else {
            formBatchSelection = CUSTOM_BATCH_VALUE;
            formCustomWineId = item.wineId;
        }
        formWineName = item.wineName;
        formPrice = item.price;
        formDescription = item.wineDescription;
        formImageUrl = item.imageUrl ?? null;
        formPhotoFilename = "";
        formOpen = true;
    };

    const generateFallbackWineId = () =>
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? `wine-${crypto.randomUUID()}`
            : `wine-${Date.now()}`;

    const saveForm = async () => {
        if (formPending) {
            return;
        }
        showValidation = true;
        const trimmedName = formWineName.trim();
        const rawPriceStr = formPrice == null ? "" : String(formPrice).trim();
        const parsedPrice = Number(rawPriceStr);
        const priceValid =
            rawPriceStr !== "" && Number.isFinite(parsedPrice) && parsedPrice >= 0;

        const resolvedWineId =
            formBatchSelection !== CUSTOM_BATCH_VALUE
                ? formBatchSelection
                : formCustomWineId.trim() || editingItem?.wineId || generateFallbackWineId();

        if (!trimmedName || !priceValid) {
            formError = "Wine name and a valid non-negative price (PLN) are required.";
            return;
        }

        formPending = true;
        formError = "";
        try {
            if (editingItem) {
                await updateOffering(editingItem.id, {
                    wineId: resolvedWineId,
                    wineName: trimmedName,
                    wineDescription: formDescription.trim(),
                    price: parsedPrice,
                    imageUrl: formImageUrl,
                });
            } else {
                await createOffering({
                    wineId: resolvedWineId,
                    wineName: trimmedName,
                    wineDescription: formDescription.trim(),
                    price: parsedPrice,
                    imageUrl: formImageUrl,
                    organisationId: organisation?.id,
                    organisationName: organisation?.name,
                });
            }
            formOpen = false;
            editingItem = null;
            await load();
        } catch (error) {
            formError =
                error instanceof Error ? error.message : "Could not save wine offering.";
        } finally {
            formPending = false;
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem || deletePending) {
            return;
        }
        deletePending = true;
        deleteError = "";
        try {
            await deleteOffering(deletingItem.id);
            deletingItem = null;
            await load();
        } catch (error) {
            deleteError =
                error instanceof Error ? error.message : "Could not delete wine offering.";
        } finally {
            deletePending = false;
        }
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="text-sm text-zinc-700">
            Only the organisation owner can manage wine offerings.
        </p>
    {:else}
        {#if vineyardCatalogPath && vineyardCatalogFullUrl}
            <section
                class="flex flex-col gap-3 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-4 text-[#3f2e22] shadow-xs sm:flex-row sm:items-center sm:justify-between"
                aria-label="Share your vineyard offerings"
            >
                <div class="min-w-0 flex-1">
                    <span class="block text-xs font-semibold tracking-wider text-[#8c735c] uppercase">
                        Direct Vineyard Catalog Link
                    </span>
                    <p class="mt-0.5 text-sm text-zinc-700">
                        Share this private vineyard link or QR code with customers so they only see
                        <strong class="font-semibold text-[#3f2e22]">
                            {organisation?.name || "your vineyard"}
                        </strong>.
                    </p>
                    <p class="mt-1 truncate font-mono text-xs text-[#6b4f3a]">
                        {vineyardCatalogFullUrl}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onclick={() => void copyCatalogLink()}
                        class="cursor-pointer rounded-lg border border-[#6b4f3a] bg-[#fbf7f2] px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
                    >
                        {copiedCatalogLink ? "Copied!" : "Copy link"}
                    </button>
                    <button
                        type="button"
                        onclick={openCatalogQrModal}
                        class="cursor-pointer rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-3.5 py-2 text-xs font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
                    >
                        Catalog QR
                    </button>
                    <a
                        href={vineyardCatalogPath}
                        class="rounded-lg bg-[#6b4f3a] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3f2e22]"
                    >
                        Open vineyard catalog →
                    </a>
                </div>
            </section>
        {/if}

        <div class="flex justify-end">
            <div class="w-56">
                <AddButton text="New offering" onClick={openCreate} />
            </div>
        </div>

        <ResultsToolbar
            bind:query={draftQuery}
            bind:sort
            bind:filter
            searchLabel="Which wine offering are you looking for?"
            searchPlaceholder="Search by wine name, description, or grape variety..."
            sortOptions={[
                { value: "name", label: "Name" },
                { value: "price_asc", label: "Price (low to high)" },
                { value: "price_desc", label: "Price (high to low)" },
            ]}
            filterOptions={styleFilterOptions}
            onSearch={() => {
                query = draftQuery;
            }}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading wine offerings...</p>
        {:else if loadError}
            <p class="text-sm text-[#8f3d32]" role="alert">{loadError}</p>
        {:else}
            {#key `${query}|${sort}|${filter}`}
                <ResultsTable rows={visibleItems} emptyLabel="No wine offerings found.">
                    {#snippet head()}
                        <th class="px-4 py-3 font-bold">Wine</th>
                        <th class="px-4 py-3 font-bold">Style & Vintage</th>
                        <th class="px-4 py-3 font-bold">Price</th>
                        <th class="px-4 py-3 text-right font-bold">Actions</th>
                    {/snippet}
                    {#snippet row(item, index)}
                        <TableRow
                            {index}
                            expandOnRowClick={true}
                            expandLabel={`Toggle details for ${item.wineName}`}
                            colspan={4}
                        >
                            {#snippet cells()}
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-3">
                                        {#if item.imageUrl}
                                            <img
                                                src={item.imageUrl}
                                                alt={`Photo of ${item.wineName}`}
                                                class="h-11 w-11 shrink-0 rounded-lg border border-[#d9cbbd] bg-[#fbf7f2] object-cover"
                                            />
                                        {:else}
                                            <span
                                                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e4d8cb] bg-[#fbf7f2] text-[10px] font-semibold uppercase text-[#8c735c]"
                                            >
                                                Wine
                                            </span>
                                        {/if}
                                        <div class="flex flex-col gap-0.5">
                                            <span class="font-semibold text-[#3f2e22]">
                                                {item.wineName}
                                            </span>
                                            {#if item.grapeType}
                                                <span class="text-xs text-zinc-600">
                                                    {item.grapeType}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3">
                                    <div class="inline-flex flex-wrap items-center gap-2">
                                        <StatusBadge
                                            label={item.wineStyle ?? "Dry wine"}
                                            tone="secondary"
                                        />
                                        {#if item.vintageYear}
                                            <StatusBadge
                                                label={String(item.vintageYear)}
                                                tone="neutral"
                                            />
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-4 py-3 font-semibold text-[#3f2e22] whitespace-nowrap">
                                    {item.price} PLN
                                </td>
                            {/snippet}
                            {#snippet actions()}
                                <div class="w-28">
                                    <Button
                                        text="QR code"
                                        isFolded={false}
                                        gentle={true}
                                        class="justify-center border border-[#6b4f3a] bg-[#fbf7f2] font-medium text-[#3f2e22]"
                                        onClick={() => openBottleQrModal(item)}
                                    />
                                </div>
                                <a
                                    href={`/offerings/${encodeURIComponent(item.id)}`}
                                    class="inline-flex h-12 shrink-0 items-center justify-center rounded-lg border border-[#c4b6a6] bg-[#fbf7f2] px-3.5 text-sm font-medium whitespace-nowrap text-[#3f2e22] shadow-sm transition-colors hover:bg-[#e4d8cb]"
                                >
                                    Customer view
                                </a>
                                <div class="w-28">
                                    <Button
                                        svg={editIcon}
                                        text="Edit"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#6b4f3a] fill-white text-white"
                                        onClick={() => openEdit(item)}
                                    />
                                </div>
                                <div class="w-32">
                                    <Button
                                        svg={closeIcon}
                                        text="Delete"
                                        isFolded={false}
                                        gentle={true}
                                        class="bg-[#8f3d32] fill-white text-white"
                                        onClick={() => {
                                            deleteError = "";
                                            deletingItem = item;
                                        }}
                                    />
                                </div>
                            {/snippet}
                            {#snippet details()}
                                <div class="flex flex-col gap-3 text-sm text-[#3f2e22]">
                                    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
                                        {#if item.imageUrl}
                                            <img
                                                src={item.imageUrl}
                                                alt={`Bottle preview for ${item.wineName}`}
                                                class="h-28 w-28 shrink-0 rounded-xl border border-[#d9cbbd] bg-white object-cover shadow-xs"
                                            />
                                        {/if}
                                        <p class="italic text-zinc-700">
                                            {item.wineDescription ||
                                                "No tasting description provided for this offering."}
                                        </p>
                                    </div>
                                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                        <div class="rounded-xl border border-[#e4d8cb] bg-white px-3.5 py-2.5">
                                            <span class="block text-xs font-medium text-zinc-500">
                                                Grape variety
                                            </span>
                                            <span class="font-semibold text-[#3f2e22]">
                                                {item.grapeType ?? "Estate Cuvée"}
                                            </span>
                                        </div>
                                        <div class="rounded-xl border border-[#e4d8cb] bg-white px-3.5 py-2.5">
                                            <span class="block text-xs font-medium text-zinc-500">
                                                Alcohol content
                                            </span>
                                            <span class="font-semibold text-[#3f2e22]">
                                                {item.alcoholPercent != null
                                                    ? `${item.alcoholPercent}% vol.`
                                                    : "12.5% vol."}
                                            </span>
                                        </div>
                                        <div class="rounded-xl border border-[#e4d8cb] bg-white px-3.5 py-2.5">
                                            <span class="block text-xs font-medium text-zinc-500">
                                                Barrel maturation
                                            </span>
                                            <span class="font-semibold text-[#3f2e22]">
                                                {item.barrelInfo ?? "Stainless steel"}
                                            </span>
                                        </div>
                                        <div class="flex items-center justify-between rounded-xl border border-[#e4d8cb] bg-white px-3.5 py-2.5">
                                            <div class="min-w-0">
                                                <span class="block text-xs font-medium text-zinc-500">
                                                    Public bottle page
                                                </span>
                                                <a
                                                    href={`/offerings/${encodeURIComponent(item.id)}`}
                                                    class="font-semibold text-[#6b4f3a] underline hover:text-[#3f2e22]"
                                                >
                                                    Open customer bottle view →
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/snippet}
                        </TableRow>
                    {/snippet}
                </ResultsTable>
            {/key}
        {/if}
    {/if}
</div>

{#if formOpen}
    <FormWindow
        title={editingItem ? "Edit wine offering" : "Add new wine offering"}
        showBreadcrumbs={false}
        acceptText={editingItem ? "Save" : "Create"}
        onClose={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
        onAccept={() => void saveForm()}
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="offering-batch-select">
                    Wine batch
                </label>
                <DropdownInput
                    id="offering-batch-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={batchDropdownOptions}
                    placeholder="Select bottled wine batch"
                    value={formBatchSelection}
                    onchange={applyBatchSelection}
                />
            </div>

            {#if formBatchSelection === CUSTOM_BATCH_VALUE}
                <InputField
                    label="Wine / bottling UUID (optional)"
                    placeholder="e.g. wine-uuid-123 (leave empty for local entry)"
                    bind:value={formCustomWineId}
                />
            {/if}

            <InputField
                label="Wine name"
                placeholder="e.g. Solaris Estate Reserve 2026"
                bind:value={formWineName}
                invalid={showValidation && !formWineName.trim()}
            />

            <InputField
                label="Price (PLN)"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 65"
                bind:value={formPrice}
                invalid={
                    showValidation &&
                    (formPrice == null ||
                        String(formPrice).trim() === "" ||
                        !Number.isFinite(Number(formPrice)) ||
                        Number(formPrice) < 0)
                }
            />

            <div class="flex flex-col gap-1.5">
                <span class="text-sm text-zinc-600">Wine photo</span>
                <label
                    class="flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#c4b6a6] bg-[#fdfaf7] transition-colors hover:border-[#8c735c]"
                    aria-label="Choose wine photo"
                >
                    {#if formImageUrl}
                        <img
                            src={formImageUrl}
                            alt="Selected wine preview"
                            class="h-full w-full object-contain p-1.5"
                        />
                    {:else}
                        <span class="px-4 text-center text-sm text-[#a89180]">
                            Click to upload wine photo (PNG, JPEG, WebP)
                        </span>
                    {/if}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        class="sr-only"
                        onchange={(event) => void handlePhotoSelected(event)}
                    />
                </label>
                {#if formImageUrl}
                    <div class="flex items-center justify-between gap-2 text-xs">
                        <span class="truncate text-zinc-500">
                            {formPhotoFilename || "Photo attached"}
                        </span>
                        <button
                            type="button"
                            onclick={clearPhoto}
                            class="cursor-pointer font-semibold text-[#8f3d32] hover:underline"
                        >
                            Remove photo
                        </button>
                    </div>
                {/if}
            </div>

            <TextareaField
                label="Description (optional)"
                placeholder="Tasting notes, aroma profile, food pairings..."
                rows={3}
                bind:value={formDescription}
            />

            {#if formError}
                <p class="text-sm text-[#8f3d32]" role="alert">{formError}</p>
            {/if}
        </div>
    </FormWindow>
{/if}

{#if deletingItem}
    <ConfirmationDialog
        title="Delete wine offering"
        text={deleteError || `Remove "${deletingItem.wineName}" from your vineyard offerings catalog?`}
        acceptText="Delete"
        onClose={() => (deletingItem = null)}
        onCancel={() => (deletingItem = null)}
        onAccept={() => void confirmDelete()}
    />
{/if}

{#if qrModalState}
    <QrCodeModal
        title={qrModalState.title}
        subtitle={qrModalState.subtitle}
        targetUrl={qrModalState.targetUrl}
        downloadFilename={qrModalState.downloadFilename}
        onClose={() => (qrModalState = null)}
    />
{/if}

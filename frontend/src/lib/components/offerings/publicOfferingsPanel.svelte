<script lang="ts">
    import { onMount } from "svelte";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import OfferingCard from "./offeringCard.svelte";
    import { getOfferings, type WineOffering } from "$lib/api/offerings";
    import { session } from "$lib/stores/session.svelte";

    let offerings = $state<WineOffering[]>([]);
    let loading = $state(true);
    let loadError = $state("");

    let searchQuery = $state("");
    let selectedStyle = $state("all");

    const isOwner = $derived(session.user?.roles.includes("OWNER") ?? false);

    const loadCatalog = async () => {
        loading = true;
        loadError = "";
        try {
            offerings = await getOfferings();
        } catch (error) {
            offerings = [];
            loadError =
                error instanceof Error
                    ? error.message
                    : "Could not load wine offerings.";
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        void loadCatalog();
    });

    const styleOptions = $derived.by(() => {
        const styles = Array.from(
            new Set(
                offerings
                    .map((item) => item.wineStyle ?? "Dry wine")
                    .filter(Boolean),
            ),
        ).sort();
        return [
            { value: "all", label: "All styles" },
            ...styles.map((style) => ({ value: style, label: style })),
        ];
    });

    const filteredOfferings = $derived.by(() => {
        const needle = searchQuery.trim().toLowerCase();
        return offerings.filter((item) => {
            const style = item.wineStyle ?? "Dry wine";
            if (selectedStyle !== "all" && style !== selectedStyle) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                item.wineName,
                item.wineDescription,
                item.grapeType ?? "",
                style,
                item.barrelInfo ?? "",
                String(item.vintageYear ?? ""),
                item.organisationName ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });
    });
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <section
        class="flex flex-col gap-5 rounded-2xl border border-[#d9cbbd] bg-[#f7f1ea] p-6 text-[#3f2e22] shadow-sm"
        aria-label="Wine offerings header"
    >
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-semibold tracking-wider text-[#8c735c] uppercase">
                    Vineyard Cellar Selection
                </span>
                <h1 class="text-2xl font-bold text-[#3f2e22] sm:text-3xl">
                    Our Wine Offerings
                </h1>
                <p class="max-w-2xl text-sm leading-relaxed text-zinc-600">
                    Explore bottled estate releases with transparent harvest dates, cellar maturation history, final wine parameters, and nutritional facts.
                </p>
            </div>

            {#if isOwner}
                <a
                    href="/management/offerings"
                    class="rounded-xl border border-[#6b4f3a] bg-[#fbf7f2] px-4 py-2.5 text-sm font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
                >
                    Manage offerings
                </a>
            {/if}
        </div>

        <div class="flex flex-col gap-3 border-t border-[#e4d8cb] pt-4 sm:flex-row sm:items-end">
            <div class="min-w-0 flex-1">
                <InputField
                    label="Search wines"
                    type="search"
                    placeholder="Search by wine name, grape variety, barrel, or vintage..."
                    bind:value={searchQuery}
                />
            </div>

            <div class="flex flex-col gap-1 sm:w-56">
                <label class="text-sm text-zinc-600" for="public-style-filter">
                    Wine style
                </label>
                <DropdownInput
                    id="public-style-filter"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={styleOptions}
                    placeholder="All styles"
                    bind:value={selectedStyle}
                />
            </div>
        </div>
    </section>

    {#if loading}
        <div
            class="rounded-2xl border border-[#d9cbbd] bg-[#fbf7f2] p-8 text-center text-sm text-zinc-600 shadow-sm"
        >
            Loading wine offerings...
        </div>
    {:else if loadError}
        <div
            class="rounded-2xl border border-[#8f3d32] bg-[#fbf7f2] p-6 text-center text-sm text-[#8f3d32] shadow-sm"
            role="alert"
        >
            {loadError}
        </div>
    {:else if filteredOfferings.length === 0}
        <div
            class="rounded-2xl border border-[#d9cbbd] bg-[#fbf7f2] p-10 text-center shadow-sm"
        >
            <p class="text-base font-semibold text-[#3f2e22]">
                No wine offerings match your criteria.
            </p>
            <p class="mt-1 text-sm text-zinc-600">
                Try clearing your search filter or check back after the next estate bottling.
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {#each filteredOfferings as offering (offering.id)}
                <OfferingCard {offering} />
            {/each}
        </div>
    {/if}
</div>

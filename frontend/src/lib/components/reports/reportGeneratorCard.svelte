<script lang="ts">
    import raportIcon from "$lib/assets/raport.svg?raw";
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import InputField from "$lib/components/inputField/inputField.svelte";
    import type { ProductionBatch } from "$lib/api/batches";
    import { formatFieldLabel, type VineyardField } from "$lib/api/fields";
    import {
        AGGREGATION_LABELS,
        REPORT_TYPE_LABELS,
        type AggregationLevel,
        type ReportParameters,
        type ReportType,
    } from "$lib/functions/reportCalculators";

    let {
        fields = [],
        batches = [],
        generating = false,
        error = "",
        onClearError,
        onGenerate,
    }: {
        fields?: VineyardField[];
        batches?: ProductionBatch[];
        generating?: boolean;
        error?: string;
        onClearError?: () => void;
        onGenerate: (params: ReportParameters) => void | Promise<void>;
    } = $props();

    const REPORT_TYPE_ORDER: ReportType[] = [
        "PRODUCTION_EFFICIENCY",
        "GRAPEVINE_DIVERSITY",
        "VINEYARD_OPERATIONS",
        "HISTORICAL_TRENDS",
    ];

    const OPERATION_OPTIONS: {
        value: NonNullable<ReportParameters["operationFilter"]>;
        label: string;
    }[] = [
        { value: "ALL", label: "All operations" },
        { value: "SPRAYING", label: "Spraying treatments" },
        { value: "HARVEST", label: "Harvests" },
        { value: "PESTS", label: "Pest & disease observations" },
        { value: "TASKS", label: "Scheduled tasks" },
    ];

    const AGGREGATION_OPTIONS: { value: AggregationLevel; label: string }[] = [
        { value: "MONTHLY", label: AGGREGATION_LABELS.MONTHLY },
        { value: "QUARTERLY", label: AGGREGATION_LABELS.QUARTERLY },
        { value: "YEARLY", label: AGGREGATION_LABELS.YEARLY },
    ];

    const currentYear = new Date().getFullYear();

    let reportType = $state<ReportType>("PRODUCTION_EFFICIENCY");
    let startDate = $state<string | number | null>(`${currentYear}-01-01`);
    let endDate = $state<string | number | null>(`${currentYear}-12-31`);
    let batchFilterId = $state("");
    let fieldFilterId = $state("");
    let operationFilter = $state<NonNullable<ReportParameters["operationFilter"]>>("ALL");
    let aggregation = $state<AggregationLevel>("MONTHLY");

    let showValidation = $state(false);
    let validationError = $state("");

    const reportTypeOptions = REPORT_TYPE_ORDER.map((type) => ({
        value: type,
        label: REPORT_TYPE_LABELS[type],
    }));

    const batchOptions = $derived([
        { value: "", label: "All batches" },
        ...batches.map((batch) => ({
            value: batch.id,
            label: batch.batchNumber ? `${batch.batchNumber} · ${batch.name}` : batch.name,
        })),
    ]);

    const fieldOptions = $derived([
        { value: "", label: "All fields" },
        ...fields.map((field) => ({
            value: field.id,
            label: formatFieldLabel(field),
        })),
    ]);

    const normalizedStart = $derived(startDate == null ? "" : String(startDate).trim());
    const normalizedEnd = $derived(endDate == null ? "" : String(endDate).trim());
    const dateOrderInvalid = $derived(
        Boolean(normalizedStart && normalizedEnd && normalizedStart > normalizedEnd),
    );
    const displayedError = $derived(validationError || error);

    const clearErrors = () => {
        validationError = "";
        onClearError?.();
    };

    const handleTypeChange = (nextValue: string) => {
        reportType = nextValue as ReportType;
        clearErrors();
    };

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (generating) {
            return;
        }
        showValidation = true;
        validationError = "";
        onClearError?.();

        if (!normalizedStart || !normalizedEnd) {
            validationError = "Select both start date and end date.";
            return;
        }
        if (normalizedStart > normalizedEnd) {
            validationError = "Start date cannot be later than end date.";
            return;
        }

        const params: ReportParameters = {
            type: reportType,
            startDate: normalizedStart,
            endDate: normalizedEnd,
            ...(reportType === "PRODUCTION_EFFICIENCY" && batchFilterId
                ? { batchFilterId }
                : {}),
            ...(reportType === "GRAPEVINE_DIVERSITY" && fieldFilterId
                ? { fieldFilterId }
                : {}),
            ...(reportType === "VINEYARD_OPERATIONS" ? { operationFilter } : {}),
            ...(reportType === "HISTORICAL_TRENDS" ? { aggregation } : {}),
        };

        await onGenerate(params);
    };
</script>

<section
    class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] p-5 shadow-sm"
    aria-label="Generate report"
>
    <form class="flex flex-col gap-4" onsubmit={(event) => void handleSubmit(event)}>
        <div class="flex flex-col gap-0.5 border-b border-[#e4d8cb] pb-3">
            <h2 class="text-lg font-semibold text-[#3f2e22]">Generate vineyard report</h2>
            <p class="text-xs text-zinc-600">
                Select report scope and date range to compute KPIs and archive a snapshot.
            </p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div class="flex flex-col gap-1">
                <label class="text-sm text-zinc-600" for="report-type-select">Report type</label>
                <DropdownInput
                    id="report-type-select"
                    class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                    options={reportTypeOptions}
                    placeholder="Select report type"
                    value={reportType}
                    onchange={handleTypeChange}
                />
            </div>

            <InputField
                label="Start date"
                type="date"
                bind:value={startDate}
                invalid={showValidation && (!normalizedStart || dateOrderInvalid)}
                oninput={clearErrors}
            />

            <InputField
                label="End date"
                type="date"
                bind:value={endDate}
                invalid={showValidation && (!normalizedEnd || dateOrderInvalid)}
                oninput={clearErrors}
            />

            {#if reportType === "PRODUCTION_EFFICIENCY"}
                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="report-batch-filter">
                        Batch filter
                    </label>
                    <DropdownInput
                        id="report-batch-filter"
                        class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                        options={batchOptions}
                        placeholder="All batches"
                        value={batchFilterId}
                        onchange={(val) => {
                            batchFilterId = val;
                            clearErrors();
                        }}
                    />
                </div>
            {:else if reportType === "GRAPEVINE_DIVERSITY"}
                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="report-field-filter">
                        Field filter
                    </label>
                    <DropdownInput
                        id="report-field-filter"
                        class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                        options={fieldOptions}
                        placeholder="All fields"
                        value={fieldFilterId}
                        onchange={(val) => {
                            fieldFilterId = val;
                            clearErrors();
                        }}
                    />
                </div>
            {:else if reportType === "VINEYARD_OPERATIONS"}
                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="report-operation-filter">
                        Operation category
                    </label>
                    <DropdownInput
                        id="report-operation-filter"
                        class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                        options={OPERATION_OPTIONS}
                        placeholder="All operations"
                        value={operationFilter}
                        onchange={(val) => {
                            operationFilter =
                                val as NonNullable<ReportParameters["operationFilter"]>;
                            clearErrors();
                        }}
                    />
                </div>
            {:else}
                <div class="flex flex-col gap-1">
                    <label class="text-sm text-zinc-600" for="report-aggregation-select">
                        Aggregation level
                    </label>
                    <DropdownInput
                        id="report-aggregation-select"
                        class="w-full [&>button]:h-12 [&>button]:w-full [&>button]:rounded-full"
                        options={AGGREGATION_OPTIONS}
                        placeholder="Monthly"
                        value={aggregation}
                        onchange={(val) => {
                            aggregation = val as AggregationLevel;
                            clearErrors();
                        }}
                    />
                </div>
            {/if}
        </div>

        {#if displayedError}
            <p
                class="rounded-xl border border-[#e2b9b3] bg-[#fdf3f2] px-4 py-2.5 text-sm text-[#8f3d32]"
                role="alert"
            >
                {displayedError}
            </p>
        {/if}

        <div class="flex justify-end">
            <button
                type="submit"
                disabled={generating}
                class="generate-btn inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#6b4f3a] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a4230] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span class="h-5 w-5 shrink-0" aria-hidden="true">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html raportIcon}
                </span>
                <span>{generating ? "Generating..." : "Generate"}</span>
            </button>
        </div>
    </form>
</section>

<style>
    .generate-btn :global(svg) {
        height: 1.25rem;
        width: 1.25rem;
        fill: currentColor;
    }
</style>

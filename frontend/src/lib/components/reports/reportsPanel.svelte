<script lang="ts">
    import { onMount } from "svelte";
    import closeIcon from "$lib/assets/close.svg?raw";
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import StatusBadge, { type BadgeTone } from "$lib/components/statusBadge/statusBadge.svelte";
    import ResultsTable from "$lib/components/tableComponents/resultsTable/resultsTable.svelte";
    import ResultsToolbar from "$lib/components/tableComponents/resultsToolbar/resultsToolbar.svelte";
    import TableRow from "$lib/components/tableComponents/tableRow/tableRow.svelte";
    import ReportGeneratorCard from "./reportGeneratorCard.svelte";
    import ReportKpiSummary from "./reportKpiSummary.svelte";
    import { getBatches, type ProductionBatch } from "$lib/api/batches";
    import { getFields, type VineyardField } from "$lib/api/fields";
    import {
        deleteSavedReport,
        downloadServerReportPdf,
        generateReport,
        getSavedReports,
        type SavedReport,
    } from "$lib/api/reports";
    import {
        formatReportAsCsv,
        REPORT_TYPE_LABELS,
        type ReportParameters,
        type ReportType,
    } from "$lib/functions/reportCalculators";
    import { session } from "$lib/stores/session.svelte";

    const SHORT_CATEGORY_LABELS: Record<ReportType, { label: string; tone: BadgeTone }> = {
        PRODUCTION_EFFICIENCY: { label: "Efficiency", tone: "primary" },
        GRAPEVINE_DIVERSITY: { label: "Grape diversity", tone: "secondary" },
        VINEYARD_OPERATIONS: { label: "Operations", tone: "neutral" },
        HISTORICAL_TRENDS: { label: "Historical trend", tone: "dark" },
    };

    let savedReports = $state<SavedReport[]>([]);
    let fields = $state<VineyardField[]>([]);
    let batches = $state<ProductionBatch[]>([]);
    let loading = $state(true);

    let generating = $state(false);
    let generateError = $state("");
    let latestGeneratedId = $state<string | null>(null);
    let generatedModalReport = $state<SavedReport | null>(null);

    let query = $state("");
    let sort = $state("newest");
    let filter = $state("all");

    let deletingReport = $state<SavedReport | null>(null);
    let downloadingPdfId = $state<string | null>(null);

    const isOwner = $derived(Boolean(session.user?.roles?.includes("OWNER")));

    const load = async () => {
        loading = true;
        try {
            savedReports = getSavedReports();
            const [loadedFields, loadedBatches] = await Promise.all([
                getFields().catch(() => []),
                getBatches().catch(() => []),
            ]);
            fields = loadedFields;
            batches = loadedBatches;
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        if (!session.user?.roles?.includes("OWNER")) {
            loading = false;
            return;
        }
        void load();
    });

    const formatGeneratedDate = (isoDate: string): string => {
        if (!isoDate) {
            return "—";
        }
        return isoDate.slice(0, 10);
    };

    const visibleReports = $derived.by(() => {
        const needle = query.trim().toLowerCase();

        const matched = savedReports.filter((report) => {
            if (filter !== "all" && report.type !== filter) {
                return false;
            }
            if (!needle) {
                return true;
            }
            const haystack = [
                report.title,
                REPORT_TYPE_LABELS[report.type] ?? report.type,
                report.startDate,
                report.endDate,
                `${report.startDate} – ${report.endDate}`,
                `${report.startDate} to ${report.endDate}`,
                report.content.summary,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });

        matched.sort((left, right) => {
            if (sort === "oldest") {
                return left.createdAt.localeCompare(right.createdAt);
            }
            if (sort === "period") {
                return (
                    right.startDate.localeCompare(left.startDate) ||
                    right.createdAt.localeCompare(left.createdAt)
                );
            }
            if (sort === "title") {
                return (
                    left.title.localeCompare(right.title) ||
                    right.createdAt.localeCompare(left.createdAt)
                );
            }
            return right.createdAt.localeCompare(left.createdAt);
        });

        return matched;
    });

    const handleGenerate = async (params: ReportParameters) => {
        if (generating) {
            return;
        }
        generating = true;
        generateError = "";
        try {
            const created = await generateReport(params, session.user?.email ?? null);
            savedReports = getSavedReports();
            latestGeneratedId = created.id;
            generatedModalReport = created;
        } catch (error) {
            generateError =
                error instanceof Error ? error.message : "Could not generate report.";
        } finally {
            generating = false;
        }
    };

    const exportReportCsv = (report: SavedReport) => {
        const csv = formatReportAsCsv(
            report.title,
            report.startDate,
            report.endDate,
            report.content,
        );
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const slug = report.type.toLowerCase().replace(/_/g, "-");
        anchor.href = url;
        anchor.download = `${slug}-${report.startDate}-to-${report.endDate}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const downloadReportPdf = async (report: SavedReport) => {
        if (downloadingPdfId) {
            return;
        }
        downloadingPdfId = report.id;
        generateError = "";
        try {
            const slug = report.type.toLowerCase().replace(/_/g, "-");
            await downloadServerReportPdf(
                report.parameters,
                `${slug}-${report.startDate}-to-${report.endDate}.pdf`,
            );
        } catch (error) {
            generateError =
                error instanceof Error ? error.message : "Could not download report PDF.";
        } finally {
            downloadingPdfId = null;
        }
    };

    const printReport = () => {
        if (typeof window !== "undefined" && typeof window.print === "function") {
            window.print();
        }
    };

    const confirmDelete = () => {
        if (!deletingReport) {
            return;
        }
        const targetId = deletingReport.id;
        deleteSavedReport(targetId);
        savedReports = getSavedReports();
        if (latestGeneratedId === targetId) {
            latestGeneratedId = null;
        }
        deletingReport = null;
    };
</script>

<div class="flex flex-col gap-4">
    {#if !isOwner}
        <p class="rounded-xl border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-3 text-sm text-[#3f2e22]">
            Only the organisation owner can generate and view vineyard reports.
        </p>
    {:else}
        <ReportGeneratorCard
            {fields}
            {batches}
            {generating}
            error={generateError}
            onClearError={() => {
                generateError = "";
            }}
            onGenerate={handleGenerate}
        />

        <ResultsToolbar
            bind:query
            bind:sort
            bind:filter
            searchLabel="What report are you looking for?"
            searchPlaceholder="Search by report title, summary, or period..."
            sortOptions={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "period", label: "Period start" },
                { value: "title", label: "Report type" },
            ]}
            filterOptions={[
                { value: "all", label: "All report types" },
                {
                    value: "PRODUCTION_EFFICIENCY",
                    label: REPORT_TYPE_LABELS.PRODUCTION_EFFICIENCY,
                },
                {
                    value: "GRAPEVINE_DIVERSITY",
                    label: REPORT_TYPE_LABELS.GRAPEVINE_DIVERSITY,
                },
                {
                    value: "VINEYARD_OPERATIONS",
                    label: REPORT_TYPE_LABELS.VINEYARD_OPERATIONS,
                },
                {
                    value: "HISTORICAL_TRENDS",
                    label: REPORT_TYPE_LABELS.HISTORICAL_TRENDS,
                },
            ]}
            onSearch={() => {}}
        />

        {#if loading}
            <p class="text-sm text-zinc-700">Loading saved reports...</p>
        {:else}
            <ResultsTable
                rows={visibleReports}
                highlightedId={latestGeneratedId ?? undefined}
                emptyLabel={savedReports.length === 0
                    ? "No reports generated yet. Choose parameters above to generate your first report."
                    : "No saved reports match your current filters."}
            >
                {#snippet head()}
                    <th class="px-4 py-3 font-bold">Report</th>
                    <th class="px-4 py-3 font-bold">Category</th>
                    <th class="px-4 py-3 font-bold">Period</th>
                    <th class="px-4 py-3 font-bold">Generated</th>
                    <th class="px-4 py-3 text-right font-bold">Actions</th>
                {/snippet}
                {#snippet row(report, index)}
                    {@const category = SHORT_CATEGORY_LABELS[report.type]}
                    <TableRow
                        {index}
                        expandOnRowClick={true}
                        highlighted={latestGeneratedId === report.id}
                        autoScrollWhenHighlighted={true}
                        expandLabel={`Toggle KPI summary for ${report.title} (${report.startDate} to ${report.endDate})`}
                    >
                        {#snippet cells()}
                            <td class="px-4 py-3 font-medium text-[#3f2e22]">
                                {report.title}
                            </td>
                            <td class="px-4 py-3">
                                <StatusBadge label={category.label} tone={category.tone} />
                            </td>
                            <td class="px-4 py-3 text-zinc-700">
                                {report.startDate} – {report.endDate}
                            </td>
                            <td class="px-4 py-3 text-zinc-700">
                                {formatGeneratedDate(report.createdAt)}
                            </td>
                        {/snippet}
                        {#snippet actions()}
                            <button
                                type="button"
                                disabled={downloadingPdfId === report.id}
                                onclick={() => void downloadReportPdf(report)}
                                class="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#3f2e22] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5a4230] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingPdfId === report.id ? "PDF..." : "Download PDF"}
                            </button>
                            <button
                                type="button"
                                onclick={() => exportReportCsv(report)}
                                class="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#6b4f3a] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5a4230]"
                            >
                                Export CSV
                            </button>
                            <button
                                type="button"
                                onclick={printReport}
                                class="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#8c735c] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#755f4b]"
                            >
                                Print
                            </button>
                            <button
                                type="button"
                                onclick={() => {
                                    deletingReport = report;
                                }}
                                class="action-btn inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#8f3d32] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#783229]"
                            >
                                <span class="h-4 w-4 shrink-0" aria-hidden="true">
                                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                    {@html closeIcon}
                                </span>
                                <span>Delete</span>
                            </button>
                        {/snippet}
                        {#snippet details()}
                            <ReportKpiSummary content={report.content} />
                        {/snippet}
                    </TableRow>
                {/snippet}
            </ResultsTable>
        {/if}
    {/if}
</div>

{#if generatedModalReport}
    {@const recipientEmail =
        generatedModalReport.emailQueuedTo ?? session.user?.email ?? "the organisation owner"}
    <FormWindow
        title="Report generated"
        showBreadcrumbs={false}
        showActions={false}
        onClose={() => (generatedModalReport = null)}
    >
        <div class="flex flex-col gap-5">
            <p class="text-base leading-relaxed text-zinc-800">
                Report has been generated and saved below. Email delivery to {recipientEmail} is
                queued (pending backend mail endpoint).
            </p>
            <div class="flex justify-end">
                <button
                    type="button"
                    onclick={() => (generatedModalReport = null)}
                    class="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center rounded-xl bg-[#6b4f3a] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a4230]"
                >
                    OK
                </button>
            </div>
        </div>
    </FormWindow>
{/if}

{#if deletingReport}
    <ConfirmationDialog
        title="Delete report"
        text={`Are you sure you want to delete "${deletingReport.title}" (${deletingReport.startDate} to ${deletingReport.endDate})?`}
        acceptText="Delete"
        onClose={() => (deletingReport = null)}
        onCancel={() => (deletingReport = null)}
        onAccept={confirmDelete}
    />
{/if}

<style>
    .action-btn :global(svg) {
        height: 1rem;
        width: 1rem;
        fill: currentColor;
    }
</style>

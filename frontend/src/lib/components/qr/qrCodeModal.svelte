<script lang="ts">
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
    import { generateQrSvg, svgToDataUri } from "$lib/functions/qrCode";

    let {
        title,
        subtitle = "",
        targetUrl,
        downloadFilename = "",
        onClose,
    }: {
        title: string;
        subtitle?: string;
        targetUrl: string;
        downloadFilename?: string;
        onClose: () => void;
    } = $props();

    let copied = $state(false);

    const qrSvgPromise = $derived(generateQrSvg(targetUrl));

    const resolvedFilename = $derived.by(() => {
        const raw = downloadFilename.trim();
        if (raw) {
            return raw.toLowerCase().endsWith(".svg") ? raw : `${raw}.svg`;
        }
        const slugSource = (subtitle || title || "qr-code")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return `${slugSource || "qr-code"}.svg`;
    });

    const escapeHtml = (value: string): string =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");

    const copyUrl = async () => {
        try {
            await navigator.clipboard?.writeText(targetUrl);
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 2000);
        } catch {
            copied = false;
        }
    };

    const handleDownloadSvg = async () => {
        try {
            const svgMarkup = await qrSvgPromise;
            const blob = new Blob([svgMarkup], {
                type: "image/svg+xml;charset=utf-8",
            });
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = resolvedFilename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            // Ignore download failure when QR payload is invalid
        }
    };

    const handlePrint = async () => {
        try {
            const svgMarkup = await qrSvgPromise;
            const dataUri = svgToDataUri(svgMarkup);
            const popup = window.open("", "_blank", "width=560,height=680");
            if (!popup) {
                window.print?.();
                return;
            }
            const safeTitle = escapeHtml(title);
            const safeSubtitle = escapeHtml(subtitle);
            const safeUrl = escapeHtml(targetUrl);

            popup.document.write(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
        body {
            margin: 0;
            padding: 32px;
            font-family: system-ui, -apple-system, sans-serif;
            color: #231810;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
        }
        h1 { font-size: 20px; margin: 0; }
        p.sub { font-size: 15px; font-weight: 600; margin: 0; color: #3f2e22; }
        .frame {
            border: 1px solid #d9cbbd;
            border-radius: 16px;
            padding: 20px;
            background: #ffffff;
        }
        img { width: 260px; height: 260px; display: block; }
        code {
            font-size: 11px;
            color: #6b4f3a;
            word-break: break-all;
            max-width: 420px;
        }
    </style>
</head>
<body>
    <h1>${safeTitle}</h1>
    ${safeSubtitle ? `<p class="sub">${safeSubtitle}</p>` : ""}
    <div class="frame">
        <img src="${dataUri}" alt="QR code" />
    </div>
    <code>${safeUrl}</code>
</body>
</html>`);
            popup.document.close();
            popup.focus();
            popup.print();
        } catch {
            window.print?.();
        }
    };
</script>

<FormWindow {title} showBreadcrumbs={false} showActions={false} {onClose}>
    <div class="flex flex-col items-center gap-4">
        {#if subtitle}
            <p class="text-center text-base font-semibold text-[#3f2e22]">
                {subtitle}
            </p>
        {/if}

        {#await qrSvgPromise}
            <div
                class="flex h-72 w-72 items-center justify-center rounded-2xl border border-[#d9cbbd] bg-white p-5 text-sm text-zinc-500 shadow-sm"
            >
                Generating QR code...
            </div>
        {:then svgMarkup}
            <div
                class="flex items-center justify-center rounded-2xl border border-[#d9cbbd] bg-white p-5 shadow-sm"
                data-testid="qr-svg-preview"
            >
                <img
                    src={svgToDataUri(svgMarkup)}
                    alt={`QR code for ${subtitle || title}`}
                    class="block h-60 w-60 select-none"
                />
            </div>
        {:catch error}
            <div
                class="rounded-2xl border border-[#8f3d32] bg-[#fbf7f2] px-5 py-4 text-center text-sm text-[#8f3d32]"
                role="alert"
            >
                {error instanceof Error ? error.message : "Could not generate QR code."}
            </div>
        {/await}

        <div
            class="flex w-full max-w-md items-center justify-between gap-2 rounded-full border border-[#d9cbbd] bg-[#fbf7f2] px-4 py-2 text-xs text-[#3f2e22]"
        >
            <code class="min-w-0 flex-1 truncate font-mono select-all" title={targetUrl}>
                {targetUrl}
            </code>
            <button
                type="button"
                onclick={() => void copyUrl()}
                class="shrink-0 cursor-pointer rounded-full border border-[#d9cbbd] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6b4f3a] transition-colors hover:bg-[#e4d8cb] hover:text-[#3f2e22]"
            >
                {copied ? "Copied" : "Copy"}
            </button>
        </div>

        <div
            class="mt-2 flex w-full flex-wrap items-center justify-end gap-2.5 border-t border-[#e4d8cb] pt-4"
        >
            <button
                type="button"
                onclick={() => void handleDownloadSvg()}
                class="cursor-pointer rounded-xl border border-[#6b4f3a] bg-[#fbf7f2] px-4 py-2.5 text-sm font-semibold text-[#3f2e22] transition-colors hover:bg-[#e4d8cb]"
            >
                Download SVG
            </button>
            <button
                type="button"
                onclick={() => void handlePrint()}
                class="cursor-pointer rounded-xl bg-[#8c735c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b4f3a]"
            >
                Print
            </button>
            <button
                type="button"
                onclick={onClose}
                class="cursor-pointer rounded-xl bg-[#6b4f3a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3f2e22]"
            >
                OK
            </button>
        </div>
    </div>
</FormWindow>

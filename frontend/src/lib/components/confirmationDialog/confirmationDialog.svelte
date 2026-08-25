<script lang="ts">
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";

    let {
        text = "",
        title = "Confirmation dialog",
        onClose = () => {},
        onCancel = () => {},
        onAccept = () => {},
        acceptText = "Confirm",
        cancelText = "Cancel",
        class: className = "",
    }: {
        text?: string;
        title?: string;
        onClose?: () => void;
        onCancel?: () => void;
        onAccept?: () => void;
        acceptText?: string;
        cancelText?: string;
        class?: string;
    } = $props();
</script>

<FormWindow
    {title}
    showBreadcrumbs={false}
    {onClose}
    {onCancel}
    {onAccept}
    {acceptText}
    {cancelText}
    class={className}
>
    <span class="text-zinc-200 text-lg leading-relaxed">{text}</span>
</FormWindow>

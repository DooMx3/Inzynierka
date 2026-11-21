<script lang="ts">
    const uid = $props.id();

    let {
        value = $bindable(""),
        placeholder = "",
        label = "",
        rows = 3,
        maxlength,
        invalid = false,
        disabled = false,
        class: className = "",
        oninput,
    }: {
        value?: string;
        placeholder?: string;
        label?: string;
        rows?: number;
        maxlength?: number;
        invalid?: boolean;
        disabled?: boolean;
        class?: string;
        oninput?: () => void;
    } = $props();

    const textareaId = `${uid}-textarea`;
</script>

<div class={["flex flex-col gap-1", className]}>
    {#if label}
        <label
            class={["text-sm shrink-0", invalid ? "text-red-700/80" : "text-zinc-600"]}
            for={textareaId}
        >
            {label}
        </label>
    {/if}
    <div
        class={[
            "flex w-full min-w-0 rounded-2xl border bg-white px-4 py-3 transition-colors duration-200",
            disabled && "cursor-not-allowed bg-[#fbf7f2] opacity-60",
            invalid
                ? "border-red-500 text-red-700/80 focus-within:border-red-600"
                : "border-[#c4b6a6] text-zinc-700 focus-within:border-[#8c735c]",
        ]}
    >
        <textarea
            id={textareaId}
            {rows}
            {maxlength}
            {placeholder}
            {disabled}
            bind:value
            oninput={() => oninput?.()}
            class={[
                "w-full min-w-0 resize-y border-none bg-transparent outline-none",
                invalid
                    ? "text-red-700/80 placeholder:text-red-400/80"
                    : "text-zinc-800 placeholder:text-zinc-400",
            ]}
            aria-invalid={invalid || undefined}
            aria-label={label ? undefined : placeholder || "Textarea"}
        ></textarea>
    </div>
</div>

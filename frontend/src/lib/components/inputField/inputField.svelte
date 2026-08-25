<script lang="ts">
    const uid = $props.id();

    let {
        value = $bindable(""),
        type = "text",
        placeholder = "",
        class: className = "",
        svg = "",
        label = "",
        labelPosition = "top",
    }: {
        value?: string;
        type?: "text" | "password" | "email" | "search";
        placeholder?: string;
        class?: string;
        svg?: string;
        label?: string;
        labelPosition?: "top" | "left";
    } = $props();

    const inputId = `${uid}-field`;
</script>

<div
    class={[
        "flex",
        labelPosition === "left" ? "flex-row items-center gap-3" : "flex-col gap-1",
        className,
    ]}
>
    {#if label}
        <label class="text-sm text-zinc-400 shrink-0" for={inputId}>{label}</label>
    {/if}
    <div
        class="flex items-center gap-2 h-12 w-full min-w-0 px-4 rounded-full border border-zinc-500 bg-zinc-700 text-zinc-400 fill-zinc-400 stroke-zinc-400 transition-colors duration-200 focus-within:border-zinc-400"
    >
        {#if svg}
            <span class="shrink-0" role="img" aria-hidden="true">{@html svg}</span>
        {/if}
        <input
            id={inputId}
            {type}
            {placeholder}
            bind:value
            class="flex-1 min-w-0 bg-transparent border-none outline-none text-zinc-300 placeholder:text-zinc-500"
            aria-label={label ? undefined : placeholder || "Input"}
        />
    </div>
</div>

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-5 w-5;
        fill: inherit;
        stroke: inherit;
    }
</style>

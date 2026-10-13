<script lang="ts">
    import PasswordVisibilityIcon from "./passwordVisibilityIcon.svelte";

    const uid = $props.id();

    let {
        value = $bindable(""),
        type = "text",
        placeholder = "",
        class: className = "",
        svg = "",
        label = "",
        labelPosition = "top",
        invalid = false,
        oninput,
    }: {
        value?: string;
        type?: "text" | "password" | "email" | "search";
        placeholder?: string;
        class?: string;
        svg?: string;
        label?: string;
        labelPosition?: "top" | "left";
        invalid?: boolean;
        oninput?: () => void;
    } = $props();

    const inputId = `${uid}-field`;
    let revealed = $state(false);
    let inputType = $derived(type === "password" && revealed ? "text" : type);
    let showVisibilityToggle = $derived(type === "password");
</script>

<div
    class={[
        "flex",
        labelPosition === "left" ? "flex-row items-center gap-3" : "flex-col gap-1",
        className,
    ]}
>
    {#if label}
        <label
            class={["text-sm shrink-0", invalid ? "text-red-700/80" : "text-zinc-600"]}
            for={inputId}>{label}</label
        >
    {/if}
    <div
        class={[
            "flex items-center gap-2 h-12 w-full min-w-0 px-4 rounded-full border bg-white transition-colors duration-200",
            invalid
                ? "border-red-500 text-red-700/80 fill-red-700/70 stroke-red-700/70 focus-within:border-red-600"
                : "border-[#c4b6a6] text-zinc-700 fill-zinc-500 stroke-zinc-500 focus-within:border-[#8c735c]",
        ]}
    >
        {#if svg}
            <span class="shrink-0" role="img" aria-hidden="true">{@html svg}</span>
        {/if}
        <input
            id={inputId}
            type={inputType}
            {placeholder}
            bind:value
            oninput={() => oninput?.()}
            class={[
                "flex-1 min-w-0 bg-transparent border-none outline-none",
                invalid
                    ? "text-red-700/80 placeholder:text-red-400/80"
                    : "text-zinc-800 placeholder:text-zinc-400",
            ]}
            aria-invalid={invalid || undefined}
            aria-label={label ? undefined : placeholder || "Input"}
        />
        {#if showVisibilityToggle}
            <button
                type="button"
                class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c735c]"
                aria-label={revealed ? "Hide password" : "Show password"}
                aria-pressed={revealed}
                aria-controls={inputId}
                onmousedown={(event) => event.preventDefault()}
                onclick={() => (revealed = !revealed)}
            >
                <PasswordVisibilityIcon concealed={!revealed} />
            </button>
        {/if}
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

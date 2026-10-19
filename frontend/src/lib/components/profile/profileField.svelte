<script lang="ts">
    import { tick } from "svelte";
    import type { Attachment } from "svelte/attachments";
    import InputField from "$lib/components/inputField/inputField.svelte";

    let {
        label,
        value,
        type = "text",
        onSave,
    }: {
        label: string;
        value: string;
        type?: "text" | "email";
        onSave: (next: string) => Promise<void>;
    } = $props();

    let form = $state<HTMLFormElement | null>(null);
    let draft = $state("");
    let editing = $state(false);
    let invalid = $state(false);
    let pending = $state(false);

    let empty = $derived(value.trim().length === 0);

    const rememberForm: Attachment<HTMLFormElement> = (node) => {
        form = node;
        return () => {
            form = null;
        };
    };

    const startEditing = async () => {
        if (editing || pending) {
            return;
        }

        draft = value;
        invalid = false;
        editing = true;
        await tick();
        form?.querySelector("input")?.focus();
    };

    const cancel = () => {
        editing = false;
        invalid = false;
        draft = value;
    };

    const submitOnEnter = (event: KeyboardEvent) => {
        if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) {
            return;
        }

        event.preventDefault();
        form?.requestSubmit();
    };

    const save = async (event: SubmitEvent) => {
        event.preventDefault();
        if (pending) {
            return;
        }

        const next = draft.trim();
        if (next === value) {
            editing = false;
            invalid = false;
            return;
        }

        pending = true;
        try {
            await onSave(next);
            editing = false;
            invalid = false;
        } catch {
            invalid = true;
        } finally {
            pending = false;
        }
    };
</script>

<form
    class="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e4d8cb] py-3 last:border-b-0"
    {@attach rememberForm}
    novalidate
    onsubmit={save}
>
    <button
        type="button"
        class="cursor-pointer text-left text-sm font-medium text-zinc-700 hover:text-[#6b4f3a]"
        onclick={startEditing}
    >
        {label}
    </button>

    {#if editing}
        <InputField
            bind:value={draft}
            {type}
            label=""
            placeholder={label}
            {invalid}
            class="min-w-0"
            oninput={() => {
                invalid = false;
            }}
            onkeydown={submitOnEnter}
        />
        <div class="flex items-center gap-1">
            <button
                type="submit"
                class="icon-btn text-[#3f6b4a]"
                aria-label="Save {label}"
                disabled={pending}
            >
                <svg viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                        d="M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM565-275q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z"
                    />
                </svg>
            </button>
            <button
                type="button"
                class="icon-btn text-[#8f3d32]"
                aria-label="Cancel {label}"
                onclick={cancel}
            >
                <svg viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                        d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"
                    />
                </svg>
            </button>
        </div>
    {:else}
        <span
            class={["truncate text-right text-sm", empty ? "text-zinc-400" : "text-zinc-900"]}
            title={empty ? undefined : value}
        >
            {empty ? "Not set" : value}
        </span>
        <button
            type="button"
            class="icon-btn text-[#6b4f3a]"
            aria-label="Edit {label}"
            onclick={startEditing}
        >
            <svg viewBox="0 -960 960 960" aria-hidden="true">
                <path
                    d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"
                />
            </svg>
        </button>
    {/if}
</form>

<style>
    @reference "../../../app.css";

    .icon-btn {
        @apply flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#efe4d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c735c] disabled:cursor-wait disabled:opacity-60;
    }

    .icon-btn svg {
        @apply h-5 w-5;
        fill: currentColor;
    }
</style>

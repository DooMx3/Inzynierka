<script lang="ts">
    import InputField from "$lib/components/inputField/inputField.svelte";
    import nameIcon from "$lib/assets/name.svg?raw";
    import cityIcon from "$lib/assets/city.svg?raw";
    import streetIcon from "$lib/assets/street.svg?raw";
    import postalCodeIcon from "$lib/assets/postal_code.svg?raw";
    import taxIcon from "$lib/assets/tax.svg?raw";
    import mottoIcon from "$lib/assets/motto.svg?raw";
    import { getOrganisationLogoUrl, type Organisation } from "$lib/api/organisation";

    interface Props {
        name: string;
        city: string;
        street: string;
        postalCode: string;
        taxId: string;
        motto: string;
        logoFile: File | null;
        logoPreviewUrl: string | null;
        organisation: Organisation | null;
        logoTimestamp: number;
        nameInvalid: boolean;
        cityInvalid: boolean;
        sideBySide: boolean;
        onLogoFileChange: (event: Event) => void;
    }

    let {
        name = $bindable(""),
        city = $bindable(""),
        street = $bindable(""),
        postalCode = $bindable(""),
        taxId = $bindable(""),
        motto = $bindable(""),
        logoFile = $bindable(null),
        logoPreviewUrl,
        organisation,
        logoTimestamp,
        nameInvalid,
        cityInvalid,
        sideBySide,
        onLogoFileChange,
    }: Props = $props();
</script>

<div class={["org-fields", sideBySide && "is-side"]}>
    <InputField class="field-name" label="Name" placeholder="Vineyard name" bind:value={name} svg={nameIcon} invalid={nameInvalid} />
    <InputField class="field-city" label="City" placeholder="City" bind:value={city} svg={cityIcon} invalid={cityInvalid} />
    <InputField class="field-street" label="Street" placeholder="Street" bind:value={street} svg={streetIcon} />
    <InputField class="field-postal" label="Postal code" placeholder="00-000" bind:value={postalCode} svg={postalCodeIcon} />
    <InputField class="field-tax" label="Tax ID" placeholder="Tax ID" bind:value={taxId} svg={taxIcon} />
    <InputField class="field-motto" label="Motto" placeholder="Motto" bind:value={motto} svg={mottoIcon} />
    <div class="logo-field">
        <span class="text-sm text-zinc-600">Logo</span>
        <label class="logo-upload-label" aria-label="Choose a logo image">
            {#if logoPreviewUrl}
                <img src={logoPreviewUrl} alt="Logo preview" class="logo-preview" />
            {:else if organisation?.logoPath}
                <img src="{getOrganisationLogoUrl()}?t={logoTimestamp}" alt="Current logo" class="logo-preview" />
            {:else}
                <span class="logo-placeholder">Click to upload logo</span>
            {/if}
            <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                onchange={onLogoFileChange}
            />
        </label>
        {#if logoFile}
            <p class="text-xs text-zinc-500 mt-1">{logoFile.name}</p>
        {/if}
    </div>
</div>

<style>
    @reference "../../../app.css";

    .org-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .org-fields.is-side {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
            "name city"
            "street postal"
            "tax motto"
            "logo logo";
        align-items: start;
        column-gap: 1.25rem;
        row-gap: 1rem;
    }

    .org-fields.is-side :global(.field-name) {
        grid-area: name;
    }

    .org-fields.is-side :global(.field-city) {
        grid-area: city;
    }

    .org-fields.is-side :global(.field-street) {
        grid-area: street;
    }

    .org-fields.is-side :global(.field-postal) {
        grid-area: postal;
    }

    .org-fields.is-side :global(.field-tax) {
        grid-area: tax;
    }

    .org-fields.is-side :global(.field-motto) {
        grid-area: motto;
    }

    .org-fields.is-side .logo-field {
        grid-area: logo;
    }

    .logo-field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .logo-upload-label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 10rem;
        border-radius: 0.75rem;
        border: 2px dashed #c4b6a6;
        background: #fdfaf7;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.2s;
    }

    .logo-upload-label:hover {
        border-color: #8c735c;
    }

    .logo-preview {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .logo-placeholder {
        font-size: 0.875rem;
        color: #a89180;
    }
</style>

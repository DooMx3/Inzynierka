export function createDraft(
    name: string,
    city: string,
    street: string,
    postalCode: string,
    taxId: string,
    motto: string
) {
    return {
        name: name.trim(),
        city: city.trim(),
        street: street.trim(),
        postalCode: postalCode.trim(),
        taxId: taxId.trim(),
        motto: motto.trim(),
    };
}

export function getOrganisationMessages(name: string, city: string) {
    const messages: string[] = [];
    if (name.trim().length === 0) {
        messages.push("Enter the organisation name.");
    }
    if (city.trim().length === 0) {
        messages.push("Enter the city.");
    }
    return messages;
}

export function formatDisplayValue(value: string | null | undefined) {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : "Not set";
}

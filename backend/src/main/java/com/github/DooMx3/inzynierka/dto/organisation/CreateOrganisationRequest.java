package com.github.DooMx3.inzynierka.dto.organisation;

public record CreateOrganisationRequest(
        String name,
        String taxId,
        String street,
        String postalCode,
        String city,
        String logoPath,
        String motto
) {
}

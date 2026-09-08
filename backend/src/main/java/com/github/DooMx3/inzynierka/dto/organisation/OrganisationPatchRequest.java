package com.github.DooMx3.inzynierka.dto.organisation;

import jakarta.validation.constraints.NotBlank;

public record OrganisationPatchRequest(
        String name,
        String taxId,
        String street,
        String postalCode,
        String city,
        String logoPath,
        String motto
) {}
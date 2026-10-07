package com.github.DooMx3.inzynierka.dto.organisation;

import jakarta.validation.constraints.NotBlank;

public record OrganisationRequest(
    @NotBlank String name,
    String taxId,
    String street,
    String postalCode,
    @NotBlank String city,
    String logoPath,
    String motto) {}
